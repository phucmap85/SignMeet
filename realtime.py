#!/usr/bin/env python3
import torch
from whisper_online import *
from transformers import pipeline
from underthesea import text_normalize, word_tokenize

import asyncio
import sys
import argparse
import re
import json
import numpy as np
import xml.etree.ElementTree as ET
import xml.dom.minidom
parser = argparse.ArgumentParser()

# server options
parser.add_argument("--host", type=str, default="127.0.0.1")
parser.add_argument("--port", type=int, default=5000)

# options from whisper_online
add_shared_args(parser)
args = parser.parse_args()

device = "cuda" if torch.cuda.is_available() else "cpu"

# setting whisper object by args 

SAMPLING_RATE = 16000

size = args.model
language = args.lan

t = time.time()
print(f"Loading Whisper {size} model for {language}...",file=sys.stderr,end="\n",flush=True)

asr = FasterWhisperASR(modelsize=size, lan=language, cache_dir=args.model_cache_dir, model_dir=args.model_dir)

# print(f"Loading ViSenSum model...",file=sys.stderr,end="\n",flush=True)

# sensum = pipeline('text2text-generation', model='PhucMap/ViSenSum', min_length=1, max_length=256, device=device)

print(f"Loading Vi-VSL model...",file=sys.stderr,end="\n",flush=True)

vsl = pipeline('text2text-generation', model='PhucMap/BARTphoVi-VSL', min_length=1, max_length=256, device=device)

if args.task == "translate":
    asr.set_translate_task()
    tgt_language = "en"
else:
    tgt_language = language

e = time.time()
print(f"Done. It took {round(e-t,2)} seconds.",file=sys.stderr)

if args.vad:
    print("Setting VAD filter",file=sys.stderr)
    asr.use_vad()


min_chunk = args.min_chunk_size

if args.buffer_trimming == "sentence":
    tokenizer = create_tokenizer(tgt_language)
else:
    tokenizer = None
online = OnlineASRProcessor(asr,tokenizer,buffer_trimming=(args.buffer_trimming, args.buffer_trimming_sec))


######### Text pre-processing

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
    print("Read HamNoSys dataset...")


# Read sign_duration dataset
sign_duration = {}
with open('dataset/sign_duration.csv', 'r', encoding='utf-8-sig') as duration:
    for line in duration.readlines()[1:]:
        temp = line.replace('\n', '').split(',')
        sign_duration[tone_normalization(temp[0]).lower()] = round(float(temp[-1]), 2)
    print("Read sign_duration dataset...")


# Sentence summarization
# def sentence_summarization(text):
#     response = sensum(str(text + ' .'))
#     return response[0]['generated_text'].replace('.', '').strip() + ' .'


# Vietnamese -> Sign Language
def vi_to_vsl(text):
    response = vsl(str(text + ' .'))
    return response[0]['generated_text'].replace('.', '').strip() + ' .'


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


def remove_unnecessary_token(text):
    # Period
    text = text.replace('!', '.')
    text = text.replace(';', '.')

    # Question
    text = text.replace('?', '.')

    # Other marks
    text = text.replace('...', '.')

    # Remove special characters and syntax except commas and dots
    text = text.replace('\xa0', ' ').replace('\r', ' ').replace('\n', ' ')
    text = re.sub(r'[^\w\s,.]', '', text)

    return text


# Last normalization
text_queue = ""
def last_normalize(text):
    global text_queue

    text = remove_unnecessary_token(text)

    # Split sentences
    sentence_arr = list(filter(None, text.split('.')))

    # Normalize and tokenize text
    sentence_arr = [tone_normalization(text_normalize(x)).strip().lower() for x in sentence_arr]

    # Doing some stupid stuff with previous text and sentence array
    if len(sentence_arr) > 1:
        if(len(text_queue) > 0):
            sentence_arr[0] = (text_queue + ' ' + sentence_arr[0]).strip()
            text_queue = ""
        if(text[-1] != '.'):
            text_queue = sentence_arr[-1]
            sentence_arr.pop(-1)
    else:
        if(text[-1] != '.'):
            text_queue = (text_queue + ' ' + sentence_arr[0]).strip()
            sentence_arr.pop(-1)
        else:
            sentence_arr[0] = (text_queue + ' ' + sentence_arr[0]).strip()
            text_queue = ""
    
    if len(sentence_arr) > 0:
        print('################### im here #####################')

        # Sentence summarization
        # sensum_sentence_arr = [tone_normalization(text_normalize(sentence_summarization(x))).lower() for x in sentence_arr]

        # Vietnamese -> Sign language
        vi_to_vsl_sentence_arr = [word_tokenize(vi_to_vsl(x), format='text') for x in sentence_arr]

        print(vi_to_vsl_sentence_arr)

        change_to_sigml = [sentence_to_sigml(remove_unnecessary_token(sentence.replace(' , ', ' ').replace(',', ''))) 
                           for sentence in vi_to_vsl_sentence_arr]
        
        res_dict = {}
        for i in range(len(change_to_sigml)):
            res_dict[str(i)] = {"vi": sentence_arr[i], "vsl": vi_to_vsl_sentence_arr[i], "sigml": change_to_sigml[i]}
        
        return json.dumps({"type": "vsl", "sentence_arr": res_dict})
    else:
        return None


######### Server objects

from websockets.server import serve
import logging


class Connection:
    '''it wraps conn object'''
    PACKET_SIZE = 65536

    def __init__(self, conn):
        self.conn = conn
        self.last_line = ""

    async def send(self, text):
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
            await self.conn.send(packet)

    async def receive(self):
        try:
            r = await self.conn.recv()
            return r
        except self.conn.ConnectionClosedOK:
            return None


import io
import soundfile

# wraps socket and ASR object, and serves one client connection. 
# next client should be served by a new instance of this object
class ServerProcessor:

    def __init__(self, c, online_asr_proc, min_chunk):
        self.connection = c
        self.online_asr_proc = online_asr_proc
        self.min_chunk = min_chunk

        self.last_end = None

    async def receive_audio_chunk(self):
        # receive all audio that is available by this time
        # blocks operation if less than self.min_chunk seconds is available
        # unblocks if connection is closed or a chunk is available
        out = []
        async for message in self.connection:
            print(message[:10])
            print(len(message))
            if(sum(len(x) for x in out) > self.min_chunk * SAMPLING_RATE):
                break
            if not message:
                break
            sf = soundfile.SoundFile(io.BytesIO(message),channels=1,endian="LITTLE",samplerate=SAMPLING_RATE, subtype="PCM_16",format="RAW")
            audio, _ = librosa.load(sf,sr=SAMPLING_RATE,dtype=np.float32)
            out.append(audio)
        if not out:
            return None
        return np.concatenate(out)

    def format_output_transcript(self,o):
        # output format in stdout is like:
        # 0 1720 Takhle to je
        # - the first two words are:
        #    - beg and end timestamp of the text segment, as estimated by Whisper model. The timestamps are not accurate, but they're useful anyway
        # - the next words: segment transcript

        # This function differs from whisper_online.output_transcript in the following:
        # succeeding [beg,end] intervals are not overlapping because ELITR protocol (implemented in online-text-flow events) requires it.
        # Therefore, beg, is max of previous end and current beg outputed by Whisper.
        # Usually it differs negligibly, by appx 20 ms.

        if o[0] is not None:
            beg, end = o[0]*1000,o[1]*1000
            if self.last_end is not None:
                beg = max(beg, self.last_end)

            self.last_end = end
            # print("%1.0f %1.0f %s" % (beg,end,o[2]),flush=True,file=sys.stderr)
            return o[2]
        else:
            print(o,file=sys.stderr,flush=True)
            return None

    async def send_result(self, o):
        start_msg = time.time()
        msg = self.format_output_transcript(o)
        end_msg = time.time()
        print(f"########### Done format_output_transcript in {round(end_msg - start_msg, 5)}s")
        if msg is not None:
            await self.connection.send(json.dumps({"type": "caption", "text": str(msg).strip()}))
            print("############################ SENT CHUNK SUCCESSFULLY! ###############################")
            start_normalize = time.time()
            tempp = last_normalize(msg)
            end_normalize = time.time()
            print(f"########## Done last_normalize in {round(end_normalize - start_normalize, 5)}s")
            print(tempp)
            if tempp is not None:
                await self.connection.send(tempp)
                print("############################ SENT SENTENCE SUCCESSFULLY! ###############################")

    async def process(self):
        # handle one client connection
        self.online_asr_proc.init()
        while True:
            a = await self.receive_audio_chunk()
            if a is None:
                print("break here",file=sys.stderr)
                break
            print(f"Size of audio received: {len(a)}")
            self.online_asr_proc.insert_audio_chunk(a)
            start_process = time.time()
            o = online.process_iter()
            end_process = time.time()
            print(f"########## Done online_process in {round(end_process - start_process, 5)}s")
            try:
                await self.send_result(o)
            except BrokenPipeError:
                print("broken pipe -- connection closed?",file=sys.stderr)
                break


# Start logging.
level = logging.INFO
logging.basicConfig(level=level)

# server loop

async def handler(websocket):
    global text_queue
    text_queue = ""
    proc = ServerProcessor(websocket, online, min_chunk)
    await proc.process()

async def main():
    async with serve(handler, args.host, args.port, ping_interval=None):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())