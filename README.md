<h1 align="left">
SignMeet: An assistive communication system for the deaf
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/stable-2.0-blue" />
	<a href="https://github.com/PL508/SignMeet/blob/server_v2/LICENSE">
      <img src="https://img.shields.io/github/license/lqphuc123/Quidk"/>
  </a>
</p>

<!-- <p align="center">
<img src="https://github.com/PL508/Vi2VSL/assets/58034112/127a0dfb-029b-4993-ba9e-50c94e7487c5"/>
</p> -->

## Installation

### Install Environment

You will need [Python 3.10 or later](https://www.python.org/downloads/). Also, we highly recommend installing a [Miniconda](https://docs.anaconda.com/free/miniconda/index.html) environment to get a high-quality BLAS library (MKL).

### Install Dependencies

All the libraries and third-party services need for SignMeet are in [setup.sh](setup.sh).</br>

Use `sudo ./setup.sh` to install.

### Setup for discrete GPU (optional)

If you want to run with **NVIDIA GPU** support, install:
- [NVIDIA CUDA](https://developer.nvidia.com/cuda-downloads) 12.2 or above.
- [NVIDIA cuDNN](https://developer.nvidia.com/cudnn) 8.9 or above.
- [Compiler](https://gist.github.com/ax3l/9489132) compatible with CUDA.

**_Note:_** You could refer to the [cuDNN Support Matrix](https://docs.nvidia.com/deeplearning/cudnn/pdf/cuDNN-Support-Matrix.pdf) for cuDNN versions with the various supported CUDA, CUDA driver and NVIDIA hardwares.

**_We are currently not supported for AMD GPU._**

## Credits
[Le Quang Phuc](https://www.facebook.com/phuc.lequang.9081/)</br>
[Huynh Tan Phuc](https://www.facebook.com/HtPuc)

## Feedback and contributions

Please let us know if you encounter a bug by [filing an issue](https://github.com/PL508/SignMeet/issues).

We appreciate all contributions. If you are planning to contribute back bug-fixes, please do so without any further discussion.

If you plan to contribute new features, utility functions, or extensions to the core, please first open an issue and discuss the feature with us.

## License
SignMeet has a MIT license, as found in the [LICENSE](LICENSE) file.