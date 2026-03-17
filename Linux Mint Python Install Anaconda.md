## Linux Mint Install Anaconda3

https://docs.anaconda.com/anaconda/install/linux/

-Anaconda download link 
https://www.anaconda.com/download/#linux

-Select your flavor of Anaconda3. Currently these samples are only using 3.7

-Once the file is downloaded, there should be a .sh file in your Downloads folder.  
-it's ok to leave it there for the installation.  
-If you did not download to your Downloads directory or moved the file, replace ~/Downloads/ with the path to the file you downloaded.  

-Verify the SHA-526 checksum(Optional but encouraged)  
`sha256sum ~/Downloads/aconda3-2019.10-Linux-x86_64.sh`

-The result should look like something like this:  
55e4db1919f49c92d5abbf27a4be5986ae157f074bf9f8238963cd4582a4068a  Anaconda3-2019.10-Linux-x86_64.sh

-Run the script  
`bash ~/Downloads/Anaconda3-2019.10-Linux-x86_64.sh`

-press RETURN/ENTER to move through the license agreement  
-Answer yes to the license agreement

-When asked about location, press RETURN/ENTER to install in the home directory

-The installer prompts “Do you wish the installer to initialize Anaconda3 by running conda init?”  
`yes`

-The installer prompts if the installer should prepend the PATH  
`yes`

-There will be a thank you message in the terminal when it is finished  

-activate the installation  
`source ~/.bashrc`  
or  
Close and open your terminal window

/------------------------------------------------------------------------------------------------------------/

### Add the Conda Forge channel to Anaconda
Conda Forge has a healthy batch of up to date python packages

https://conda-forge.org/

Add Conda Forge to the Anaconda Channels  
-open the terminal  
-Confirm that the base env is activated  
`conda activate`

-Add conda forge  
`conda config --add channels conda-forge`

-In the IDE refresh the channels

/------------------------------------------------------------------------------------------------------------/

### To Update Anaconda:
-open a new terminal window

-update conda  
`conda update conda`

-update anaconda  
`conda update anaconda`

-open anaconda navigator  
`anaconda-navigator`

/------------------------------------------------------------------------------------------------------------/

### To add a desktop icon because the installer does not:  
https://askubuntu.com/questions/1017284/cant-create-anaconda-shortcut-to-launch-from-desktop-on-ubuntu-17-10

-Create a text document in the HOME directory  
-Save the document as: Anaconda.desktop  
-paste the following text in the document  
-NOTE: replace the 3 instances of **USERNAME** with your username  

```
[Desktop Entry]Version=1.0  
Type=Application  
Name=Anaconda-Navigator  
GenericName=Anaconda  
Comment=Scientific Python Development Environment - Python3  
Exec=bash -c 'export PATH="/home/USERNAME/anaconda3/bin:$PATH" && /home/USERNAME/anaconda3/bin/anaconda-navigator'  
Categories=Development;Science;IDE;Qt;Education;  
Icon=/home/USERNAME/anaconda3/lib/python3.7/site-packages/anaconda_navigator/static/images/anaconda-icon-256x256.png  
Terminal=false  
StartupNotify=true  
MimeType=text/x-python;
```  

-Save the file  
-copy the file to /usr/share/applications  
`sudo cp Anaconda.desktop /usr/share/applications`  

-The application should be visible in the list of programs  

### Done
-Create a text document in the HOME directory
-Save the document as: Anaconda.desktop
-paste the following text in the document
-NOTE: replace USERNAME with your username

[Desktop Entry]
Version=1.0
Type=Application
Name=Anaconda-Navigator
GenericName=Anaconda
Comment=Scientific Python Development Environment - Python3
Exec=bash -c 'export PATH="/home/USERNAME/anaconda3/bin:$PATH" && /home/USERNAME/anaconda3/bin/anaconda-navigator'
Categories=DevelLinux Mint Install Anaconda

https://docs.anaconda.com/anaconda/install/linux/

-anaconda download link 
https://www.anaconda.com/download/#linux

-Once the file is downloaded, there should be a .sh file in your doewnloads folder.
-it's ok to leave it there for the installation.
-If you did not download to your Downloads directory or moved the file, replace ~/Downloads/ with the path to the file you downloaded.

-Verify the SHA-526 checksum
sha256sum ~/Downloads/aconda3-2019.10-Linux-x86_64.sh

-Check for your hash here: https://docs.anaconda.com/anaconda/install/hashes/

-The result should look like something like this:
46d762284d252e51cd58a8ca6c8adc9da2eadc82c342927b2f66ed011d1d8b53  Anaconda3-2019.10-Linux-x86_64.sh

-Run the script
bash ~/Downloads/Anaconda3-2019.10-Linux-x86_64.sh

-press RETURN/ENTER to move through the license agreement
-Answer yes to the license agreement

-When asked about location, press RETURN/ENTER to install in the home directory

-The installer prompts “Do you wish the installer to initialize Anaconda3 by running conda init?” 
yes

-When asked if the installer should prepend the PATH, type yes

-There will be a thank you message in the terminal when it is finished



To Update:
-open a new terminal window
-update conda
conda update conda
-update anaconda
conda update anaconda

-To open Anaconda Navigator from the command line:
-open anaconda navigator
anaconda-navigator




To add a desktop Icon Because the installer does not provide one:
https://askubuntu.com/questions/1017284/cant-create-anaconda-shortcut-to-launch-from-desktop-on-ubuntu-17-10

-Create a text document in the HOME directory
-Save the document as: Anaconda.desktop
-paste the following text in the document
-NOTE: replace the 3 instances of USERNAME with your username

[Desktop Entry]opment;Science;IDE;Qt;Education;
Icon=/home/USERNAME/anaconda3/lib/python3.7/site-packages/anaconda_navigator/static/images/anaconda-icon-256x256.png
Terminal=false
StartupNotify=true
MimeType=text/x-python;

-Save the file
-copy the file to /usr/share/applications
sudo cp Anaconda.desktop /usr/share/applications

-The application should be visible in the list of programs

Done
