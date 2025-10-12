from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler

# TensorFlow imports
try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError as e:
    TF_AVAILABLE = False
    tf = None

router = APIRouter(
    prefix="/predict",
    tags=["predict"],
    responses={404: {"description": "Not found"}},
)

# Global variables for model storage
loaded_models = {}
loaded_scalers = {}

# Cache for loaded data
data_cache = {}

def load_model(model_path):
    """Load a single model file"""
    if not TF_AVAILABLE:
        raise ImportError("TensorFlow is not available")
    
    if model_path in loaded_models:
        return loaded_models[model_path]
    
    try:
        model = tf.keras.models.load_model(model_path, compile=False)
        loaded_models[model_path] = model
        return model
    except Exception as e:
        raise RuntimeError(f"Failed to load model {model_path}: {str(e)}")

def load_plant_data(plant):
    """Load and cache plant data with preprocessing"""
    cache_key = f"plant_{plant}"
    
    if cache_key in data_cache:
        return data_cache[cache_key]
    
    # Load the appropriate CSV file
    csv_file = f"data/plant{plant}_final.csv"
    
    if not os.path.exists(csv_file):
        raise FileNotFoundError(f"Data file {csv_file} not found")
    
    # Load and preprocess data
    df = pd.read_csv(csv_file)
    df['DATE_TIME'] = pd.to_datetime(df['DATE_TIME'])
    
    # Cyclical encoding of timestamps (same as in the notebook)
    df['hour'] = df['DATE_TIME'].dt.hour
    df['minute'] = df['DATE_TIME'].dt.minute
    df['time_of_day'] = df['hour'] + df['minute']/60
    df['hour_sin'] = np.sin(2 * np.pi * df['time_of_day'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['time_of_day'] / 24)
    df['day_of_year'] = df['DATE_TIME'].dt.dayofyear
    df['day_sin'] = np.sin(2 * np.pi * df['day_of_year'] / 365)
    df['day_cos'] = np.cos(2 * np.pi * df['day_of_year'] / 365)
    
    # Drop intermediate columns
    df = df.drop(columns=['hour', 'minute', 'time_of_day', 'day_of_year'])
    
    # Cache the processed data
    data_cache[cache_key] = df
    return df

def get_or_create_scalers(plant):
    """Get or create scalers for a specific plant"""
    scaler_key = f"plant_{plant}"
    
    if scaler_key in loaded_scalers:
        return loaded_scalers[scaler_key]
    
    # Load plant data to fit scalers
    df = load_plant_data(plant)
    
    # Features and target (same as in notebook)
    features = [
        'DC_POWER', 'AMBIENT_TEMPERATURE', 'MODULE_TEMPERATURE', 'IRRADIATION',
        'hour_sin', 'hour_cos', 'day_sin', 'day_cos'
    ]
    target = 'AC_POWER'
    
    # Create and fit scalers
    scaler_features = MinMaxScaler()
    scaler_target = MinMaxScaler()
    
    scaler_features.fit(df[features])
    scaler_target.fit(df[[target]])
    
    scalers = {
        'features': scaler_features,
        'target': scaler_target,
        'feature_columns': features
    }
    
    # Cache the scalers
    loaded_scalers[scaler_key] = scalers
    return scalers

def prepare_sequence_for_prediction(plant, inverter, prediction_timestamp):
    """Prepare a 24-hour sequence for prediction"""
    # Load plant data
    df = load_plant_data(plant)
    
    # Filter data for the specific inverter
    inverter_df = df[df['SOURCE_KEY'] == int(inverter)]
    
    if inverter_df.empty:
        raise ValueError(f"No data found for inverter {inverter} in plant {plant}")
    
    # Convert prediction timestamp to datetime
    pred_time = pd.to_datetime(prediction_timestamp)
    
    # Get 24 hours of data before the prediction timestamp (sequence_length = 24)
    start_time = pred_time - timedelta(hours=6)  # 6 hours before to get 24 15-minute intervals
    
    # Filter data for the sequence window
    sequence_df = inverter_df[
        (inverter_df['DATE_TIME'] >= start_time) & 
        (inverter_df['DATE_TIME'] < pred_time)
    ].sort_values('DATE_TIME')
    
    if len(sequence_df) < 24:
        raise ValueError(f"Insufficient historical data for prediction. Need 24 data points, got {len(sequence_df)}")
    
    # Take the last 24 data points
    sequence_df = sequence_df.tail(24)
    
    # Get scalers
    scalers = get_or_create_scalers(plant)
    
    # Scale the features
    features = scalers['feature_columns']
    scaled_features = scalers['features'].transform(sequence_df[features])
    
    # Reshape for LSTM input (1, sequence_length, n_features)
    X = scaled_features.reshape(1, 24, len(features))
    
    return X, scalers

def load_all_models():
    """Load the required inverter models"""
    if not TF_AVAILABLE:
        return
    
    # Define only the inverter models we need
    model_files = [
        "Plant1_inverter_Model_V2.keras",  # Use V2 for Plant 1
        "Plant2_inverter_Model.keras"
    ]
    
    for model_file in model_files:
        if os.path.exists(model_file):
            try:
                load_model(model_file)
            except Exception:
                pass  # Continue loading other models if one fails

@router.get("/")
def predict_root():
    return {
        "message": "Predict endpoint ready", 
        "tensorflow_available": TF_AVAILABLE,
        "loaded_models": len(loaded_models) if TF_AVAILABLE else 0
    }

@router.get("/timestamps")
def get_prediction_timestamps(plant: str = Query(..., description="Plant number (1 or 2)"), 
                            inverter: str = Query(..., description="Inverter ID")):
    """Get available prediction timestamps for a specific plant and inverter"""
    
    # Validate plant parameter
    if plant not in ["1", "2"]:
        raise HTTPException(status_code=400, detail="Plant must be 1 or 2")
    
    # Load the appropriate timestamp file
    timestamp_file = f"prediction_timestamps_plant_{plant}.json"
    
    if not os.path.exists(timestamp_file):
        raise HTTPException(status_code=404, detail=f"Timestamp file not found for plant {plant}")
    
    try:
        with open(timestamp_file, 'r') as f:
            data = json.load(f)
        
        # Check if inverter exists
        if inverter not in data["inverters"]:
            available_inverters = list(data["inverters"].keys())
            raise HTTPException(
                status_code=404, 
                detail=f"Inverter {inverter} not found for plant {plant}. Available inverters: {available_inverters}"
            )
        
        inverter_data = data["inverters"][inverter]
        
        return {
            "plant": plant,
            "inverter": inverter,
            "prediction_count": inverter_data["prediction_count"],
            "first_prediction": inverter_data["first_prediction"],
            "last_prediction": inverter_data["last_prediction"],
            "timestamps": inverter_data["timestamps"]
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error reading timestamp file")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Timestamp file not found for plant {plant}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/generate")
def generate_prediction(plant: str = Query(..., description="Plant number (1 or 2)"), 
                       inverter: str = Query(..., description="Inverter ID"),
                       timestamp: str = Query(..., description="Prediction timestamp in ISO format")):
    """Generate a prediction for a specific plant, inverter, and timestamp"""
    
    # Validate plant parameter
    if plant not in ["1", "2"]:
        raise HTTPException(status_code=400, detail="Plant must be 1 or 2")
    
    # Check if TensorFlow is available
    if not TF_AVAILABLE:
        raise HTTPException(status_code=503, detail="TensorFlow is not available for predictions")
    
    # Validate timestamp format
    try:
        datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid timestamp format. Use ISO format like '2020-06-17T23:45:00'")
    
    # Load the appropriate timestamp file to validate the timestamp
    timestamp_file = f"prediction_timestamps_plant_{plant}.json"
    
    if not os.path.exists(timestamp_file):
        raise HTTPException(status_code=404, detail=f"Timestamp file not found for plant {plant}")
    
    try:
        with open(timestamp_file, 'r') as f:
            data = json.load(f)
        
        # Check if inverter exists
        if inverter not in data["inverters"]:
            available_inverters = list(data["inverters"].keys())
            raise HTTPException(
                status_code=404, 
                detail=f"Inverter {inverter} not found for plant {plant}. Available inverters: {available_inverters}"
            )
        
        # Validate that the timestamp is available for prediction
        inverter_data = data["inverters"][inverter]
        if timestamp not in inverter_data["timestamps"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Timestamp {timestamp} is not available for prediction. Use /predict/timestamps to get valid timestamps."
            )
        
        # Determine the correct model file
        model_file = f"Plant{plant}_inverter_Model_V2.keras" if plant == "1" else f"Plant{plant}_inverter_Model.keras"
        
        # Check if model is loaded
        if model_file not in loaded_models:
            raise HTTPException(status_code=503, detail=f"Model for plant {plant} is not loaded")
        
        # Get the model
        model = loaded_models[model_file]
        
        try:
            # Prepare the input sequence for prediction
            X, scalers = prepare_sequence_for_prediction(plant, inverter, timestamp)
            
            # Make prediction using the loaded model
            prediction_scaled = model.predict(X, verbose=0)
            
            # Inverse transform to get actual AC_POWER value
            predicted_ac_power = scalers['target'].inverse_transform(prediction_scaled)[0][0]
            
            # Ensure non-negative values (AC power cannot be negative)
            predicted_ac_power = max(0.0, float(predicted_ac_power))
            
            return {
                "plant": plant,
                "inverter": inverter,
                "prediction_timestamp": timestamp,
                "predicted_ac_power": round(predicted_ac_power, 2),
                "model_used": model_file,
                "sequence_length": 24,
                "status": "success"
            }
            
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=f"Data preparation error: {str(ve)}")
        except FileNotFoundError as fe:
            raise HTTPException(status_code=404, detail=f"Data file error: {str(fe)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error reading timestamp file")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Timestamp file not found for plant {plant}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Load models when the module is imported
if TF_AVAILABLE:
    load_all_models()