from flask import Flask, jsonify, request
from flask_cors import CORS

# 初始化 Flask 应用
app = Flask(__name__)
# 设置 CORS，允许所有来源的跨域请求，这在开发阶段很方便
CORS(app)

# 一个简单的根路由，用来测试服务器是否正常运行
@app.route('/')
def index():
    return "狼人杀AI模型后端服务已启动！"

# 我们的第一个API端点，未来将用于概率预测
@app.route('/api/predict', methods=['POST'])
def predict():
    # 从前端请求中获取JSON数据
    # request_data = request.get_json()
    
    # 目前，我们只返回一个占位符响应
    # TODO: 在这里实现真正的概率计算逻辑
    response_data = {
        "message": "AI模型正在准备中，这里是预留的预测接口。",
        # "received_data": request_data # 可以取消注释来查看前端发来的数据
    }
    
    return jsonify(response_data)

# 运行服务器
if __name__ == '__main__':
    # 使用 debug=True 可以在修改代码后自动重启服务器
    app.run(debug=True, port=5000)