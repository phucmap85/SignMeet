from flask import Flask, request, jsonify
from flask_cors import cross_origin

# Initialize Flask app
app = Flask(__name__)

@app.route("/k", methods=['GET'])
@cross_origin()
def test():
    k = request.args["t"]
    return "OKE"

if __name__ == '__main__':
  # run app on port 1212
  app.run(port=1212, debug=True)