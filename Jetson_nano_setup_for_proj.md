seting the python path

```
which python
which python3
```
```
sudo nano ~/.bashrc 
```

```
export PATH="$PATH:/usr/local/bin/python"

/usr/bin/python


export PATH="$PATH:/usr/local/bin/python3"
/usr/bin/python3
```


These instructions are for setting up a nano to run one project
There are no Virtual ENV
one note: updating caused a problem because of Ubuntu/NVIDIA - there is no update step

The majority of this came from this link:  
https://www.pyimagesearch.com/2020/03/25/how-to-configure-your-nvidia-jetson-nano-for-computer-vision-and-deep-learning/

Prepare the Jetson Nano  

Set the JN to use maximum power 10W  

```
sudo nvpmodel -m 0
sudo jetson_clocks
```

Remove Libre Office  

```
sudo apt-get purge libreoffice*
sudo apt-get clean
```

Don't do this  
Update System  

```
sudo apt-get update && sudo apt-get upgrade
```

Install dev tools  

```
sudo apt-get install git cmake
sudo apt-get install libatlas-base-dev gfortran
sudo apt-get install libhdf5-serial-dev hdf5-tools
sudo apt-get install python3-dev
sudo apt-get install nano locate
```

SciPy prerequisites & system level Cython Library  

```
sudo apt-get install libfreetype6-dev python3-setuptools
sudo apt-get install protobuf-compiler libprotobuf-dev openssl
sudo apt-get install libssl-dev libcurl4-openssl-dev
sudo apt-get install cython3
```
Add XML tools for wotking with TF object detection  

```
sudo apt-get install libxml2-dev libxslt1-dev
```

Update CMake for compliling openCV  

```
wget http://www.cmake.org/files/v3.13/cmake-3.13.0.tar.gz
tar xpvf cmake-3.13.0.tar.gz cmake-3.13.0/
```

Compile CMake  

```
cd cmake-3.13.0/
./bootstrap --system-curl
```
This may take some time - get a coffee  

Run Make  

```
make -j4
```

update the bash profile  

```
echo 'export PATH=/home/nvidia/cmake-3.13.0/bin/:$PATH' >> ~/.bashrc
source ~/.bashrc
```

Install OpenCV and dependancies  

```
sudo apt-get install build-essential pkg-config
sudo apt-get install libtbb2 libtbb-dev
```

Codecs and image libraries  

```
sudo apt-get install libavcodec-dev libavformat-dev libswscale-dev
sudo apt-get install libxvidcore-dev libavresample-dev
sudo apt-get install libtiff-dev libjpeg-dev libpng-dev
```

GUI libraries  

```
sudo apt-get install python-tk libgtk-3-dev
sudo apt-get install libcanberra-gtk-module libcanberra-gtk3-module
```

Video4Linux  

```
sudo apt-get install libv4l-dev libdc1394-22-dev
```

Install pip  

```
sudo apt install python3-pip
```

Install the Protobuf Compiler  

```
wget https://raw.githubusercontent.com/jkjung-avt/jetson_nano/master/install_protobuf-3.6.1.sh
sudo chmod +x install_protobuf-3.6.1.sh
./install_protobuf-3.6.1.sh
```

This may take a long time - get a coffee or tea  

Install TensorFlow, Keras, NumPy, and SciPy  


Install NumPy and Cython - one at a time. Cython first  

```
pip3 install cython
pip3 install numpy
```

Install SciPy  
This is done without pip due to combatibility issues between tensorflow 1.13.1 and SciPy 1.3.3  

```
wget https://github.com/scipy/scipy/releases/download/v1.3.3/scipy-1.3.3.tar.gz
tar -xzvf scipy-1.3.3.tar.gz scipy-1.3.3
cd scipy-1.3.3/
sudo python3 setup.py install
```
This may take a long time - get a coffee or tea  


TensorFlow
https://forums.developer.nvidia.com/t/official-tensorflow-for-jetson-nano/71770  
https://docs.nvidia.com/deeplearning/frameworks/install-tf-jetson-platform/index.html  
https://docs.nvidia.com/deeplearning/frameworks/install-tf-jetson-platform-release-notes/tf-jetson-rel.html  
https://developer.download.nvidia.com/compute/redist/jp/

Install tensorflow  
https://forums.developer.nvidia.com/t/official-tensorflow-for-jetson-nano/71770

Python 3.6+JetPack4.5  
```
sudo apt-get install libhdf5-serial-dev hdf5-tools libhdf5-dev zlib1g-dev zip libjpeg8-dev liblapack-dev libblas-dev gfortran
sudo apt-get install python3-pip
sudo pip3 install -U pip testresources setuptools==49.6.0
sudo pip3 install -U numpy==1.16.1 future==0.18.2 mock==3.0.5 h5py==2.10.0 keras_preprocessing==1.1.1 keras_applications==1.0.8 gast==0.2.2 futures protobuf pybind11
# TF-2.x
$ sudo pip3 install --pre --extra-index-url https://developer.download.nvidia.com/compute/redist/jp/v45 tensorflow
# TF-1.15
$ sudo pip3 install --pre --extra-index-url https://developer.download.nvidia.com/compute/redist/jp/v45 tensorflow==1.15.4+nv20.12
```

We dont always want the latest version and require a specific one. So we resort to grabbing the packages according to what we need.  

This section can be confusing - to target the correct version, we need to know:  
TensorFlow Version  
NVIDIA TensorFlow Container  
JetPack Version  

This link will tell us what matches what  
https://docs.nvidia.com/deeplearning/frameworks/install-tf-jetson-platform-release-notes/tf-jetson-rel.html  

This link has all the available versions. Currently(21.01.26), there are no versions for JP 4.5  
https://developer.download.nvidia.com/compute/redist/jp/  

from the above information a command can be made where:  

$JP_VERSION = jetpack version. this is not necessarilly the version you are using, this is a folder where the TF is kept  
$TF_VERSION = the TF version  
$NV_VERSION = NVIDIA TensorFlow Container  

```
sudo pip3 install --extra-index-url https://developer.download.nvidia.com/compute/redist/jp/v$JP_VERSION tensorflow==$TF_VERSION+nv$NV_VERSION
```

Install Keras  

```
pip3 install keras
```

Install the TensorFlow Object Detection API (TFOD API)  
https://github.com/NVIDIA-AI-IOT/tf_trt_models  


Clone the models repository from TF  

```
git clone https://github.com/tensorflow/models
cd models && git checkout
```

Install COCO API - This may be a bit wierd  
This message:  
```
UPDATING build/lib.linux-aarch64-3.6/matplotlib/_version.py
set build/lib.linux-aarch64-3.6/matplotlib/_version.py to '3.3.3'
error: Setup script exited with error: Failed to download FreeType. Please download one of ['https://downloads.sourceforge.net/project/freetype/freetype2/2.6.1/freetype-2.6.1.tar.gz', 'https://download.savannah.gnu.org/releases/freetype/freetype-2.6.1.tar.gz'] and extract it into build/freetype-2.6.1 at the top-level of the source repository.
```

also this:  

```
WARNING: The directory '/home/todd/.cache/pip' or its parent directory is not owned or is not writable by the current user. The cache has been disabled. Check the permissions and owner of that directory. If executing pip with sudo, you may want sudo's -H flag.
```

```
cd ~
git clone https://github.com/cocodataset/cocoapi.git
cd cocoapi/PythonAPI
sudo python3 setup.py install
```

compile protbuf libs  

```
cd ~/models/research/
protoc object_detection/protos/*.proto --python_out=.
```

Create a nano script - custom  

```
nano ~/setup.sh
```

Add these lines to the file  

```
#!/bin/sh
export PYTHONPATH=$PYTHONPATH:/home/`whoami`/models/research:\
/home/`whoami`/models/research/slim
```

install the tf_trt_models library from GitHub. This package contains TensorRT-optimized models for the Jetson Nano.  

```
cd ~
git clone --recursive https://github.com/NVIDIA-Jetson/tf_trt_models.git
cd tf_trt_models
./install.sh
```






