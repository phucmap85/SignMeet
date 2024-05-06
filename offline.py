from keras.models import load_model
from underthesea import text_normalize
from openai import OpenAI
import numpy as np
import os

from flask import Flask, request, jsonify
from flask_cors import cross_origin

dict_map = {
  "òa": "oà",
  "Òa": "Oà",
  "ÒA": "OÀ",
  "óa": "oá",
  "Óa": "Oá",
  "ÓA": "OÁ",
  "ỏa": "oả",
  "Ỏa": "Oả",
  "ỎA": "OẢ",
  "õa": "oã",
  "Õa": "Oã",
  "ÕA": "OÃ",
  "ọa": "oạ",
  "Ọa": "Oạ",
  "ỌA": "OẠ",
  "òe": "oè",
  "Òe": "Oè",
  "ÒE": "OÈ",
  "óe": "oé",
  "Óe": "Oé",
  "ÓE": "OÉ",
  "ỏe": "oẻ",
  "Ỏe": "Oẻ",
  "ỎE": "OẺ",
  "õe": "oẽ",
  "Õe": "Oẽ",
  "ÕE": "OẼ",
  "ọe": "oẹ",
  "Ọe": "Oẹ",
  "ỌE": "OẸ",
  "ùy": "uỳ",
  "Ùy": "Uỳ",
  "ÙY": "UỲ",
  "úy": "uý",
  "Úy": "Uý",
  "ÚY": "UÝ",
  "ủy": "uỷ",
  "Ủy": "Uỷ",
  "ỦY": "UỶ",
  "ũy": "uỹ",
  "Ũy": "Uỹ",
  "ŨY": "UỸ",
  "ụy": "uỵ",
  "Ụy": "Uỵ",
  "ỤY": "UỴ",
}


# Tone normalization in Vietnamese
def tone_normalization(text):
  for i, j in dict_map.items():
    text = text.replace(i, j)
  return text


# Load classes and get max timestep size
data_path = 'dataset/VNSL'
classes = sorted(os.listdir(data_path))
timestep = 0
for folder in classes:
  class_path = data_path + '/' + folder
  for file in os.listdir(class_path):
    timestep = max(timestep, len(np.load(class_path + '/' + file)))


# Load sign prediction model
reg_vnsl = load_model('RegVNSL.h5')


# Set up OpenAI API
client = OpenAI(api_key='sk-proj-6JE1xXy4qejnBUv6psAWT3BlbkFJhcJXOSumi1ka0rGlaBuF')
init_prompt = """Bạn sẽ được cho một danh sách các cụm từ/câu theo thứ tự mà người khiếm thính đã biểu diễn. 
Hãy gợi ý một cách sắp xếp chúng thành một câu có nghĩa và nếu có thể, hãy thêm những từ hoặc dấu câu mà bạn cho là cần thiết để câu đầu ra trở nên dễ hiểu hơn.

Ví dụ: 
"tôi/khoẻ/bạn/như thế nào" -> "tôi rất khoẻ, còn bạn như thế nào?"
"xin chào/hôm nay/như thế nào/bạn" -> "xin chào, ngày hôm nay của bạn như thế nào?"
"hôm qua/ở đâu/bạn" -> "ngày hôm qua bạn đã ở đâu?"
"là gì/tên/bạn" -> "tên của bạn là gì?"
"cảm ơn/bạn" -> "tôi cảm ơn bạn."
"bạn/là ai/tên/là gì/bạn" -> "bạn là ai? tên bạn là gì?"
"đi/chơi/tôi" -> "tôi đang đi chơi."

Chỉ in ra một đáp án duy nhất, nếu không thực hiện được trả về "None". Bắt buộc sử dụng tiếng Việt.
Hãy giúp tôi thực hiện với các cụm từ/câu sau: """


# Initialize Flask app
app = Flask(__name__)


# Sentence Completion
@app.route("/sentence", methods=['POST'])
@cross_origin()
def sentence_completion():
  try:
    # Get array from web
    list_words = request.form['text']

    prompt = init_prompt + list_words

    completion = client.chat.completions.create(
      model="gpt-3.5-turbo",
      messages=[
        {"role": "system", "content": "Bạn là một phiên dịch viên từ ngôn ngữ ký hiệu sang tiếng Việt tài giỏi."},
        {"role": "user", "content": prompt}
      ]
    )
    
    return jsonify({'result': tone_normalization(text_normalize(completion.choices[0].message.content))})
  except:
    return jsonify({'result': 'None'})


# Sign Prediction
@app.route("/word", methods=['POST'])
@cross_origin()
def word_predict():
  try:
    # Get array from request
    recv_arr = request.form['arr']

    # Convert to NumPy array and reshape
    lm_list = np.fromstring(recv_arr, sep=',')
    lm_list = np.reshape(lm_list, (-1, 144))

    # Add missing timestep
    while(lm_list.shape[0] < timestep):
      lm_list = np.append(lm_list, np.zeros((1, lm_list.shape[1])), axis=0)
    
    print(lm_list.shape)

    # Reshape
    lm_list = lm_list.reshape((-1, lm_list.shape[0], lm_list.shape[1]))
    
    # Predict
    results = reg_vnsl.predict(lm_list)
    index = np.argmax(results)

    # Return result
    if(results[0][index] > 0.7):
      return jsonify({'result': classes[index]})
    else:
      return jsonify({'result': 'None'})
  except:
    return jsonify({'result': 'None'})


if __name__ == '__main__':
  # run app on port 1212
  app.run(port=1212, debug=True)