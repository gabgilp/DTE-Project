# main.py

from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
import pandas as pd

app = FastAPI()

import pandas as pd

# 读取数据
# 加载时设定时间格式
df_weather_1 = pd.read_csv("data/Plant_1_Weather_Sensor_Data.csv", parse_dates=["DATE_TIME"], dayfirst=True)
df_gen_1 = pd.read_csv("data/Plant_1_Generation_Data.csv", parse_dates=["DATE_TIME"], dayfirst=True)
df_weather_2 = pd.read_csv("data/Plant_2_Weather_Sensor_Data.csv", parse_dates=["DATE_TIME"], dayfirst=True)
df_gen_2 = pd.read_csv("data/Plant_2_Generation_Data.csv", parse_dates=["DATE_TIME"], dayfirst=True)

print("[DEBUG] df_weather_2 SOURCE_KEY", df_weather_2["SOURCE_KEY"].unique())
print("[DEBUG] df_gen_2 SOURCE_KEY", df_gen_2["SOURCE_KEY"].unique()) 

# 合并数据（按时间 + 面板ID）
df_merged_1 = pd.merge(
    df_weather_1,
    df_gen_1,
    how="inner",
    on=["DATE_TIME", "SOURCE_KEY"]
)
print(df_merged_1.head())

print("[DEBUG] df_merged_1 columns:", df_merged_1.columns)

df_merged_2 = pd.merge(
    df_weather_2,
    df_gen_2,
    how="inner",
    on=["DATE_TIME", "SOURCE_KEY"]
)
print(df_merged_2.head())

print("[DEBUG] df_merged_2 columns:", df_merged_2.columns)

# 简单测试用的根目录接口
@app.get("/")
def read_root():
    return {"message": "🌞 Solar Twin Backend is running!"}

# 🌍 Replay历史数据
@app.get("/replay")
def replay(
    plant: int = Query(1, description="Choose plant: 1 or 2"),
    timestamp: str = Query(..., description="Format: YYYY-MM-DD HH:MM:SS")
):
    # print(df_weather_1.head())
    # print(df_gen_1.head())
    # print(df_merged_1["DATE_TIME"].unique()[:10])

    # 尝试解析时间戳
    try:
        ts = pd.to_datetime(timestamp)
    except:
        return JSONResponse(status_code=400, content={"error": "Invalid timestamp format"})

    # 选择数据源
    if plant == 1:
        df = df_merged_1
    elif plant == 2:
        df = df_merged_2
    else:
        return JSONResponse(status_code=400, content={"error": "Invalid plant number"})


    # 查找匹配的时间戳
    result = df[df["DATE_TIME"] == ts]

    # print(f"[DEBUG] Received timestamp: {timestamp} | Parsed as: {ts}")
    # print(f"[DEBUG] Found {len(result)} matching rows")

    if result.empty:
        return {"message": "No data found for that timestamp."}
    


    return result.to_dict(orient="records")

# 用于展示趋势图
@app.get("/replay_range")
def replay_range(
    plant: int = Query(1, description="Plant number (1 or 2)"),
    start: str = Query(..., description="Start datetime in YYYY-MM-DD HH:MM:SS"),
    end: str = Query(..., description="End datetime in YYYY-MM-DD HH:MM:SS")
):
    try:
        start_ts = pd.to_datetime(start)
        end_ts = pd.to_datetime(end)
    except:
        return JSONResponse(status_code=400, content={"error": "Invalid datetime format"})

    df = df_merged_1 if plant == 1 else df_merged_2
    data = df[(df["DATE_TIME"] >= start_ts) & (df["DATE_TIME"] <= end_ts)]

    if data.empty:
        return {"message": "No data found in the given range."}
    return data.to_dict(orient="records")


# 用于前端选择面板
# 用户可以通过传参 ?plant=1 或 ?plant=2 来选择电站编号
@app.get("/panels")
def get_panels(plant: int = Query(1, description="Plant number (1 or 2)")):
    # 根据传入的电站编号选择对应的数据集
    df = df_merged_1 if plant == 1 else df_merged_2
    # 从数据集中提取所有的 SOURCE_KEY（即太阳能面板的编号），去重后转为列表
    panel_ids = df["SOURCE_KEY"].unique().tolist()
    # ✅ 可选调试输出，用于在后台查看当前 plant 包含的面板编号
    print(f"[DEBUG] Plant {plant} has panels: {panel_ids}")
    # 返回 JSON 格式，结构为 {"panels": [面板ID列表]}
    return {"panels": panel_ids}


# 分析面板健康状态
@app.get("/panel_data")
def get_panel_data(
    plant: int = Query(1, description="Plant number (1 or 2)"),
    panel: str = Query(..., description="Source Key of the panel"),
    start: str = Query(..., description="Start datetime"),
    end: str = Query(..., description="End datetime")
):
    try:
        start_ts = pd.to_datetime(start)
        end_ts = pd.to_datetime(end)
    except:
        return JSONResponse(status_code=400, content={"error": "Invalid datetime format"})

    df = df_merged_1 if plant == 1 else df_merged_2
    panel_data = df[
        (df["SOURCE_KEY"] == panel) &
        (df["DATE_TIME"] >= start_ts) &
        (df["DATE_TIME"] <= end_ts)
    ]
    if panel_data.empty:
        return {"message": "No data for the specified panel in this time range."}
    return panel_data.to_dict(orient="records")


# 用于模型开发，属于下一个开发阶段的任务
@app.get("/predict")
def predict():
    # 🔮 暂时留空，等你训练好模型后再实现
    return {"message": "🔮 Prediction endpoint coming soon... Stay tuned!"}
