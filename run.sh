#!/bin/bash

export LD_LIBRARY_PATH=`python3 -c 'import os; import nvidia.cublas.lib; import nvidia.cudnn.lib; print(os.path.dirname(nvidia.cublas.lib.__file__) + ":" + os.path.dirname(nvidia.cudnn.lib.__file__))'`
python realtime.py --language vi --model large-v2 --task transcribe --backend faster-whisper --vad --buffer_trimming_sec 10