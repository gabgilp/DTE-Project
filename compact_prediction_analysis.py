#!/usr/bin/env python3
"""
Compact script to compute only the TIMESTAMPS when predictions are possible for each inverter.
Creates lightweight database files that just store the dates for API usage.
"""

import pandas as pd
from datetime import datetime
import os
import json

def compute_prediction_timestamps_compact(plant_num, sequence_length=24):
    """
    Compute only the timestamps when predictions are possible for each inverter.
    Much more compact - just stores dates, not all the detailed data.
    """
    csv_file = f"data/plant{plant_num}_final.csv"
    
    print(f"🔍 Computing prediction timestamps for Plant {plant_num}...")
    print(f"📁 Reading: {csv_file}")
    
    if not os.path.exists(csv_file):
        print(f"❌ File not found: {csv_file}")
        return None
    
    # Read the data
    df = pd.read_csv(csv_file)
    print(f"📊 Loaded {len(df):,} records")
    
    # Convert DATE_TIME to datetime
    df['DATE_TIME'] = pd.to_datetime(df['DATE_TIME'])
    
    # Get unique inverters
    unique_sources = sorted(df['SOURCE_KEY'].unique())
    total_inverters = len(unique_sources)
    print(f"📋 Processing {total_inverters} inverters...")
    
    # Initialize compact database
    compact_db = {
        'plant': plant_num,
        'generated_at': datetime.now().isoformat(),
        'sequence_length': sequence_length,
        'inverters': {}
    }
    
    total_timestamps = 0
    
    for i, source_key in enumerate(unique_sources, 1):
        print(f"   🔄 [{i:2d}/{total_inverters}] Processing {source_key}...")
        
        # Get data for this inverter only
        inverter_df = df[df['SOURCE_KEY'] == source_key].copy()
        inverter_df = inverter_df.sort_values('DATE_TIME').reset_index(drop=True)
        
        # Find valid prediction timestamps (just the dates)
        prediction_timestamps = []
        
        for idx in range(len(inverter_df) - sequence_length):
            # Check if we have a complete sequence of 24 valid readings
            sequence_data = inverter_df.iloc[idx:idx + sequence_length]
            
            # Check if all AC_POWER values in sequence are valid (not NaN)
            if sequence_data['AC_POWER'].notna().all():
                # The prediction timestamp is right after the sequence
                prediction_time = inverter_df.iloc[idx + sequence_length]['DATE_TIME']
                prediction_timestamps.append(prediction_time.isoformat())
        
        # Store only the essential information
        compact_db['inverters'][str(source_key)] = {
            'inverter_id': int(source_key),
            'prediction_count': len(prediction_timestamps),
            'first_prediction': prediction_timestamps[0] if prediction_timestamps else None,
            'last_prediction': prediction_timestamps[-1] if prediction_timestamps else None,
            'timestamps': prediction_timestamps  # Just the timestamps, nothing else
        }
        
        total_timestamps += len(prediction_timestamps)
        print(f"      ✅ Found {len(prediction_timestamps):,} prediction timestamps")
    
    # Add summary
    compact_db['summary'] = {
        'total_inverters': total_inverters,
        'total_prediction_timestamps': total_timestamps,
        'average_per_inverter': round(total_timestamps / max(1, total_inverters), 1),
        'date_range': {
            'start': df['DATE_TIME'].min().isoformat(),
            'end': df['DATE_TIME'].max().isoformat()
        }
    }
    
    print("✅ Analysis complete!")
    print(f"📊 Total prediction timestamps: {total_timestamps:,}")
    
    return compact_db

def save_compact_database(compact_db, plant_num):
    """Save the compact prediction database"""
    
    filename = f"ML/prediction_timestamps_plant_{plant_num}.json"
    
    print("💾 Saving compact database...")
    with open(filename, 'w') as f:
        json.dump(compact_db, f, indent=2)
    
    file_size_kb = os.path.getsize(filename) / 1024
    print(f"   📁 Saved: {filename} ({file_size_kb:.1f} KB)")
    
    return filename

def print_compact_summary(compact_db):
    """Print a summary of the compact database"""
    plant = compact_db['plant']
    summary = compact_db['summary']
    
    print(f"\n📊 PLANT {plant} COMPACT DATABASE SUMMARY")
    print("=" * 50)
    print(f"Generated: {compact_db['generated_at'][:19]}")
    print(f"Total Inverters: {summary['total_inverters']}")
    print(f"Total Timestamps: {summary['total_prediction_timestamps']:,}")
    print(f"Average per Inverter: {summary['average_per_inverter']}")
    
    # Show date range
    print("\n📅 PREDICTION DATE RANGE:")
    print(f"   From: {summary['date_range']['start'][:19]}")
    print(f"   To:   {summary['date_range']['end'][:19]}")
    
    # Show top 5 inverters by timestamp count
    inverter_stats = []
    for source_key, data in compact_db['inverters'].items():
        inverter_stats.append((source_key, data['prediction_count']))
    
    inverter_stats.sort(key=lambda x: x[1], reverse=True)
    
    print("\n🏆 TOP 5 INVERTERS BY TIMESTAMP COUNT:")
    print("-" * 40)
    for i, (source_key, count) in enumerate(inverter_stats[:5]):
        print(f"{i+1}. Inverter {source_key}: {count:,} timestamps")

def main():
    """Main function - create compact prediction timestamp databases"""
    print("🚀 COMPACT PREDICTION TIMESTAMP COMPUTATION")
    print("=" * 60)
    print("📦 Creating lightweight databases with just timestamps")
    print("=" * 60)
    
    for plant_num in [1, 2]:
        print(f"\n🌱 PROCESSING PLANT {plant_num}")
        print("-" * 30)
        
        try:
            # Compute compact timestamps
            compact_db = compute_prediction_timestamps_compact(plant_num)
            
            if compact_db:
                # Print summary
                print_compact_summary(compact_db)
                
                # Save to file
                filename = save_compact_database(compact_db, plant_num)
                
                print(f"\n✅ Plant {plant_num} processing complete!")
                print(f"   📁 Use {filename} for API timestamp lookups")
            else:
                print(f"❌ Failed to process Plant {plant_num}")
                
        except Exception as e:
            print(f"❌ Error processing Plant {plant_num}: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n" + "="*60)
    
    print("🎉 COMPACT DATABASES CREATED!")

if __name__ == "__main__":
    main()