from influxdb_client_3 import InfluxDBClient3

# to start the server i use:
# influxdb3 serve \
# --node-id host01 \
# --object-store file \
# --data-dir ~/DTE/DTE-Project/.influxdb3 \
# --max-http-request-size 16000000

client = InfluxDBClient3(
    host="http://127.0.0.1:8181",
    token="apiv3_7yspe-v_XcKVaJGo4IEyAZxL_g_SMK_6iQeb2tODrMlvKYj9cnaSYO6ut-Wbs1MWTFfxfjBJj0LoRK2oBw-Nsg",
    org="",
    database="solarplants",
    auth_scheme="Bearer"
)

print("Connection Successful!")

try:
    query = '''SELECT *
               FROM plant1
               WHERE time >= '2020-05-15T00:00:00Z'
                    AND time <= '2020-05-15T12:00:00Z'
               ORDER BY time 
            '''
    table = client.query(query=query, language="sql", mode="pandas")
    print("SQL Query Results:")
    print(table)

except Exception as e:
    print(f"SQL Query failed: {e}")

try:
    query = '''SELECT *
               FROM plant2
               WHERE time >= '2020-05-20T00:00:00Z'
                    AND time <= '2020-05-25T12:00:00Z'
                    AND "SOURCE_KEY" == 1
               ORDER BY time 
            '''
    table = client.query(query=query, language="sql", mode="pandas")
    print("SQL Query Results:")
    print(table)

except Exception as e:
    print(f"SQL Query failed: {e}")