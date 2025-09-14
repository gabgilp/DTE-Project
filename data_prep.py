from influxdb_client_3 import InfluxDBClient3
import pandas as pd

client = InfluxDBClient3(
    host="http://127.0.0.1:8181",
    token="apiv3_7yspe-v_XcKVaJGo4IEyAZxL_g_SMK_6iQeb2tODrMlvKYj9cnaSYO6ut-Wbs1MWTFfxfjBJj0LoRK2oBw-Nsg",
    org="",
    database="solarplants",
    auth_scheme="Bearer"
)

print("Connection Successful!")

# plant_id and source_key (only in the weather sensor files) are redundant, so we drop them
plant1_generation = pd.read_csv("data/Plant_1_Generation_Data.csv", 
                                parse_dates=["DATE_TIME"], dayfirst=True).drop(columns=["PLANT_ID"])
plant1_weather = pd.read_csv("data/Plant_1_Weather_Sensor_Data.csv", 
                                parse_dates=["DATE_TIME"]).drop(columns=["PLANT_ID","SOURCE_KEY"])

plant2_generation = pd.read_csv("data/Plant_2_Generation_Data.csv", 
                                parse_dates=["DATE_TIME"]).drop(columns=["PLANT_ID"])
plant2_weather = pd.read_csv("data/Plant_2_Weather_Sensor_Data.csv", 
                                parse_dates=["DATE_TIME"]).drop(columns=["PLANT_ID","SOURCE_KEY"])

plant1 = pd.merge(plant1_generation, plant1_weather, on="DATE_TIME")
plant2 = pd.merge(plant2_generation, plant2_weather, on="DATE_TIME")

# replace string source keys with integers 1-22
source_keys_1 = plant1["SOURCE_KEY"].unique()
panel_num_mapping_1 = dict(zip(source_keys_1, range(1,len(source_keys_1)+1)))
plant1["SOURCE_KEY"] = plant1["SOURCE_KEY"].map(panel_num_mapping_1)

source_keys_2 = plant2["SOURCE_KEY"].unique()
panel_num_mapping_2 = dict(zip(source_keys_2, range(1,len(source_keys_2)+1)))
plant2["SOURCE_KEY"] = plant2["SOURCE_KEY"].map(panel_num_mapping_2)

plant1 = plant1.set_index("DATE_TIME")
plant2 = plant2.set_index("DATE_TIME")

# write the dataframes back to csv files, if needed as backup (?)
plant1.to_csv("data/plant1_final.csv")
plant2.to_csv("data/plant2_final.csv")

# write the dataframes to influxdb3
try:
    client.write(plant1, data_frame_measurement_name="plant1", data_frame_tag_columns=["SOURCE_KEY"])
    print("DataFrame successfully written to InfluxDB!")
except Exception as e:
    print(f"Failed to write to InfluxDB: {e}")

try:
    client.write(plant2, data_frame_measurement_name="plant2", data_frame_tag_columns=["SOURCE_KEY"])
    print("DataFrame successfully written to InfluxDB!")
except Exception as e:
    print(f"Failed to write to InfluxDB: {e}")

# influxdb3 Token: apiv3_7yspe-v_XcKVaJGo4IEyAZxL_g_SMK_6iQeb2tODrMlvKYj9cnaSYO6ut-Wbs1MWTFfxfjBJj0LoRK2oBw-Nsg
# HTTP Requests Header: Authorization: Bearer apiv3_7yspe-v_XcKVaJGo4IEyAZxL_g_SMK_6iQeb2tODrMlvKYj9cnaSYO6ut-Wbs1MWTFfxfjBJj0LoRK2oBw-Nsg