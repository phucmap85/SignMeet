#!/usr/bin/env python3
import torch
import asyncio
import sys
import json
import re
import numpy as np

from faster_whisper import WhisperModel
from underthesea import text_normalize, word_tokenize

import xml.etree.ElementTree as ET
import xml.dom.minidom

SAMPLING_RATE = 16000
PACKET_SIZE = 65536

device = 0 if torch.cuda.is_available() else -1
whisper = WhisperModel("PhucMap/phothitham-medium-ct2", device=("cuda" if device == 0 else "cpu"),
                       compute_type=("float16" if device == 0 else "int8"))

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


# Tone normalization
def tone_normalization(text):
    for i, j in dict_map.items():
        text = text.replace(i, j)
    return text


# Replace special Unicode characters
list_of_word = {
    'dau_sac': 'hamfinger2,hampinky,hamextfingerl,hampalml,hamshouldertop,hamreplace,hamfinger2,hampinky,hamextfingeru,hampalmd,hamshouldertop',
    'dau_huyen': 'hamfinger2,hampinky,hamextfingerl,hampalmd,hamshouldertop,hammovedr',
    'dau_hoi': 'hampinch12open,hammiddlefinger,hamfingerbendmod,hamringfinger,hamfingerbendmod,hamextfingeru,hampalml,hamshouldertop,hammoved,hamarcr',
    'dau_nga': 'hamfinger2,hampinky,hamextfingero,hampalml,hamshouldertop,hammover,hamwavy,hamellipsev,hamreplace,hamfinger2,hampinky,hamextfingeru,hampalmd',
    'dau_nang': 'hamfinger2,hampinky,hamextfingero,hampalml,hamshouldertop,hammoveo',
}


# Read HamNoSys dataset
with open('dataset/VSL-HamNoSys.txt', 'r', encoding='utf-8-sig') as hamnosys:
    for line in hamnosys.readlines()[1:]:
        temp = line.replace('\n', '').split('\t')
        list_of_word[tone_normalization(temp[0]).lower()] = temp[-1]


# Read sign_duration dataset
sign_duration = {}
with open('dataset/sign_duration.csv', 'r', encoding='utf-8-sig') as duration:
    for line in duration.readlines()[1:]:
        temp = line.replace('\n', '').split(',')
        sign_duration[tone_normalization(temp[0]).lower()] = round(float(temp[-1]), 2)


mark_map = {
    'á': ['a', 'dau_sac'],
    'à': ['a', 'dau_huyen'],
    'ả': ['a', 'dau_hoi'],
    'ã': ['a', 'dau_nga'],
    'ạ': ['a', 'dau_nang'],

    'ắ': ['ă', 'dau_sac'],
    'ằ': ['ă', 'dau_huyen'],
    'ẳ': ['ă', 'dau_hoi'],
    'ẵ': ['ă', 'dau_nga'],
    'ặ': ['ă', 'dau_nang'],

    'ấ': ['â', 'dau_sac'],
    'ầ': ['â', 'dau_huyen'],
    'ẩ': ['â', 'dau_hoi'],
    'ẫ': ['â', 'dau_nga'],
    'ậ': ['â', 'dau_nang'],

    'é': ['e', 'dau_sac'],
    'è': ['e', 'dau_huyen'],
    'ẻ': ['e', 'dau_hoi'],
    'ẽ': ['e', 'dau_nga'],
    'ẹ': ['e', 'dau_nang'],

    'ế': ['ê', 'dau_sac'],
    'ề': ['ê', 'dau_huyen'],
    'ể': ['ê', 'dau_hoi'],
    'ễ': ['ê', 'dau_nga'],
    'ệ': ['ê', 'dau_nang'],

    'í': ['i', 'dau_sac'],
    'ì': ['i', 'dau_huyen'],
    'ỉ': ['i', 'dau_hoi'],
    'ĩ': ['i', 'dau_nga'],
    'ị': ['i', 'dau_nang'],

    'ó': ['o', 'dau_sac'],
    'ò': ['o', 'dau_huyen'],
    'ỏ': ['o', 'dau_hoi'],
    'õ': ['o', 'dau_nga'],
    'ọ': ['o', 'dau_nang'],

    'ố': ['ô', 'dau_sac'],
    'ồ': ['ô', 'dau_huyen'],
    'ổ': ['ô', 'dau_hoi'],
    'ỗ': ['ô', 'dau_nga'],
    'ộ': ['ô', 'dau_nang'],

    'ớ': ['ơ', 'dau_sac'],
    'ờ': ['ơ', 'dau_huyen'],
    'ở': ['ơ', 'dau_hoi'],
    'ỡ': ['ơ', 'dau_nga'],
    'ợ': ['ơ', 'dau_nang'],

    'ú': ['u', 'dau_sac'],
    'ù': ['u', 'dau_huyen'],
    'ủ': ['u', 'dau_hoi'],
    'ũ': ['u', 'dau_nga'],
    'ụ': ['u', 'dau_nang'],

    'ứ': ['ư', 'dau_sac'],
    'ừ': ['ư', 'dau_huyen'],
    'ử': ['ư', 'dau_hoi'],
    'ữ': ['ư', 'dau_nga'],
    'ự': ['ư', 'dau_nang'],

    'ý': ['y', 'dau_sac'],
    'ỳ': ['y', 'dau_huyen'],
    'ỷ': ['y', 'dau_hoi'],
    'ỹ': ['y', 'dau_nga'],
    'ỵ': ['y', 'dau_nang'],
}


def replace_special_mark(letter):
    if letter in mark_map:
        return mark_map[letter]
    return letter


# Sentence to HamNoSys SiGML
def sentence_to_sigml(sentence):
    main = ET.Element('sigml')
    temp_list = sentence.split()

    sentence_words = []

    for word in temp_list:
        if word in list_of_word and sign_duration[word] >= 0.1:
            sentence_words.append(word)
        else:
            for letter in word.replace('_', ''):
                sentence_words.extend(replace_special_mark(letter))

    for word in sentence_words:
        itemGloss = ET.SubElement(main, 'hns_sign')
        itemGloss.set('gloss', word)
        itemNonManual = ET.SubElement(itemGloss, 'hamnosys_nonmanual')
        itemManual = ET.SubElement(itemGloss, 'hamnosys_manual')

        for letter in list_of_word[word].split(','):
            ET.SubElement(itemManual, letter)

    dataStr = ET.tostring(main, encoding='unicode')
    dom = xml.dom.minidom.parseString(dataStr)
    aux = dom.toprettyxml(encoding='UTF-8').decode("utf-8")

    return aux


def realtime_preprocess_transcript(text):
    # Period
    text = text.replace('!', '.')
    text = text.replace(';', '.')

    # Question
    text = text.replace('?', '.')

    # Other marks
    text = text.replace('...', '.')

    # Remove special syntax
    text = text.replace('\xa0', ' ').replace('\r', ' ').replace('\n', ' ')
    text = re.sub(r"[^\w\s.]", "", text)

    # Normalize and tokenize text
    text = word_tokenize(tone_normalization(text_normalize(text)).strip(), format="text").lower()

    return text


######### Server objects

from websockets.server import serve
import logging


class Connection:
    '''it wraps conn object'''
    def __init__(self, conn):
        self.conn = conn
        self.last_line = ""

    def send(self, text):
        '''it doesn't send the same line twice, because it was problematic in online-text-flow-events'''
        if text == self.last_line:
            return
        self.last_line = text

        text.replace('\0', '\n')
        lines = text.splitlines()
        first_line = '' if len(lines) == 0 else lines[0]
        # TODO Is there a better way of handling bad input than 'replace'?
        data = first_line.encode('utf-8', errors='replace') + b'\n\0'
        for offset in range(0, len(data), PACKET_SIZE):
            bytes_remaining = len(data) - offset
            if bytes_remaining < PACKET_SIZE:
                padding_length = PACKET_SIZE - bytes_remaining
                packet = data[offset:] + b'\0' * padding_length
            else:
                packet = data[offset:offset+PACKET_SIZE]
            self.conn.send(packet)

    async def receive(self):
        try:
            r = await self.conn.recv()
            return r
        except self.conn.ConnectionClosedOK:
            return None


import io
import librosa
import soundfile


# wraps socket and ASR object, and serves one client connection. 
# next client should be served by a new instance of this object
class ServerProcessor:
    def __init__(self, c):
        self.connection = c
        self.last_end = None

    async def receive_audio_chunk(self):
        out = []
        async for message in self.connection:
            print(message[:10])
            print(len(message))
            if(len(message) < 10):
                break
            if not message:
                break
            sf = soundfile.SoundFile(io.BytesIO(message),channels=1,endian='LITTLE',samplerate=SAMPLING_RATE,subtype="PCM_16",format="RAW")
            audio, _ = librosa.load(sf,sr=SAMPLING_RATE,dtype=np.float32)
            out.append(audio)
        if not out:
            return None
        return np.concatenate(out)

    async def send_result(self, o):
        text = ""
    
        try:
            # Transcribe audio
            segments, _ = whisper.transcribe(o, vad_filter=True, beam_size=5, language='vi', without_timestamps=True)
            text = "".join(segment.text for segment in segments)
        except:
            text = ""
        
        text = realtime_preprocess_transcript(text).replace('_', ' ')
        sigml = sentence_to_sigml(text)

        print("############################## " + text + " ##############################")

        await self.connection.send(json.dumps({'sigml': sigml, 'text': text}))

    async def process(self):
        # handle one client connection
        while True:
            a = await self.receive_audio_chunk()
            if a is None:
                print("break here",file=sys.stderr)
                break
            print(f"Size of audio received: {len(a)}")
            
            try:
                await self.send_result(a)
            except BrokenPipeError:
                print("broken pipe -- connection closed?",file=sys.stderr)
                break


# Start logging.
level = logging.INFO
logging.basicConfig(level=level)


# server loop
async def handler(websocket):
    proc = ServerProcessor(websocket)
    await proc.process()


async def main():
    async with serve(handler, "127.0.0.1", 5000):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())