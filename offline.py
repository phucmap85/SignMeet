from keras.models import load_model
from underthesea import text_normalize
from openai import OpenAI
import numpy as np
import json
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
data_path = 'dataset/n_VNSL'
classes = sorted(os.listdir(data_path))
timestep = 0
for folder in classes:
  class_path = data_path + '/' + folder
  for file in os.listdir(class_path):
    timestep = max(timestep, len(np.load(class_path + '/' + file)))
print('max_timestep_size:', timestep)

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

Chỉ in ra một đáp án duy nhất. Bắt buộc sử dụng tiếng Việt.
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
    
    response = tone_normalization(text_normalize(completion.choices[0].message.content))
    
    response = response.replace("\"", "").strip()

    return jsonify({'result': response})
  except:
    return jsonify({'result': 'None'})


def landmarks_normalization(landmarks):
  lm_list = []

  base_x, base_y, base_z = landmarks[0][0], landmarks[0][1], landmarks[0][2]

  center_x = np.mean([lm[0] for lm in landmarks])
  center_y = np.mean([lm[1] for lm in landmarks])
  center_z = np.mean([lm[2] for lm in landmarks])

  distances = [np.sqrt((lm[0] - center_x)**2 + (lm[1] - center_y)**2 + (lm[2] - center_z)**2) for lm in landmarks[1:]]

  scale_factors = [1.0 / dist if dist != 0 else 0.0 for dist in distances]

  lm_list.append(0.0)
  lm_list.append(0.0)
  lm_list.append(0.0)

  for lm, scale_factor in zip(landmarks[1:], scale_factors):
    lm_list.append((lm[0] - base_x) * scale_factor)
    lm_list.append((lm[1] - base_y) * scale_factor)
    lm_list.append((lm[2] - base_z) * scale_factor)

  return np.asarray(lm_list)


# Sign Prediction
@app.route("/word", methods=['POST'])
@cross_origin()
def word_predict():
  try:
    # Get array from request
    recv_arr = request.form['arr']

    print(recv_arr)

    # Convert to NumPy array and reshape
    lm_list = np.fromstring(recv_arr, sep=',')
    print(lm_list.shape)
    lm_list = np.reshape(lm_list, (-1, 192))
    print(lm_list.shape)

    # Add missing timestep
    while(lm_list.shape[0] < timestep):
      lm_list = np.append(lm_list, np.zeros((1, lm_list.shape[1])), axis=0)
    
    # Landmarks normalization
    n_lm_list = []
    
    for lm in lm_list:
      pose = np.asarray(lm[:24]).reshape((-1, 4))
      lh = np.asarray(lm[24:108]).reshape((-1, 4))
      rh = np.asarray(lm[108:]).reshape((-1, 4))

      n_lm_list.append(np.concatenate([landmarks_normalization(pose), landmarks_normalization(lh), landmarks_normalization(rh)]))
    
    # Reshape
    n_lm_list = np.asarray(n_lm_list)
    n_lm_list = n_lm_list.reshape((-1, n_lm_list.shape[0], n_lm_list.shape[1]))
    
    print(n_lm_list.shape)
    
    # Predict
    results = reg_vnsl.predict(n_lm_list)
    index = np.argmax(results)

    # Return result
    if(results[0][index] > 0.8):
      return jsonify({'result': classes[index]})
    else:
      return jsonify({'result': 'None'})
  except:
    return jsonify({'result': 'None'})


recv_sigml_arr = []

# Send sigml
@app.route("/send-sigml", methods=['POST'])
@cross_origin()
def send_sigml():
  # try:
  text = request.form['text']
  sigml = request.form['sigml']
  
  print(text)
  print(sigml)
  
  recv_sigml_arr.append({'text': text, 'sigml': sigml})
  print(recv_sigml_arr)
  
  return "Receive"
  # except:
  #   return "Not receive"


# Receive sigml
@app.route("/recv-sigml", methods=['GET'])
@cross_origin()
def receive_sigml():
  # try:
  if(len(recv_sigml_arr)) > 0:
    temp = json.dumps(recv_sigml_arr.pop(0))
    print(temp)
    return temp
  else:
    return jsonify({'sigml': 'None', 'text': 'None'})
  # except:
  #   return jsonify({'sigml': 'None', 'text': 'None'})


if __name__ == '__main__':
  # run app on port 1212
  app.run(port=1212, debug=True)