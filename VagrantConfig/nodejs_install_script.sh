#!/bin/bash
ABSOLUTE_HOME=$(printf ~);
PYTHON_EXECUTABLE='python';

function install_python() {
	# Installs Python.
	if python --version | grep -q "2.7" ; then
		echo 'Python installed already';
	else
		echo 'Installing Python';
		echo $PATH | grep -q "$HOME/local/bin" || $(echo "export PATH=$HOME/local/bin:$PATH" >> ~/.bashrc && . ~/.bashrc);
		mkdir -p ~/local/bin;
		mkdir -p ~/python-install;
		cd ~/python-install;
		rm -R ./* ;
		curl https://www.python.org/ftp/python/2.7.9/Python-2.7.9.tgz | tar xz --strip-components=1
		./configure --prefix=$ABSOLUTE_HOME/local;
		make install;
		cd ~/local/bin;
		ln -s python2.7 python;
		rm -R ~/python-install;
		PYTHON_EXECUTABLE=$ABSOLUTE_HOME/local/bin/python2.7;
	fi
}
function install_gcc() {
	# Installs GCC 4.8.
	if gcc --version | grep -Eq "\(GCC\) (4\.8|[5-9])" ; then
		echo 'GCC version >=4.8 installed';
	else
		echo 'Installing GCC version 4.8';
		echo $PATH | grep -q "$HOME/local/bin" || $(echo "export PATH=$HOME/local/bin:$PATH" >> ~/.bashrc && . ~/.bashrc);
		mkdir -p ~/local/bin;
		mkdir -p ~/python-install;
		cd ~/gcc-install;
		rm -R ./* ;
		curl ftp://www.mirrorservice.org/sites/ftp.gnu.org/gnu/gcc/gcc-4.8.5/gcc-4.8.5.tar.gz | tar xz --strip-components=1
		./configure --prefix=$ABSOLUTE_HOME/local;
		make install;
		cd ~/local/bin;
	fi
}
function install_nodejs() {
	# Installs NodeJS.
	if node -v | grep -q version ; then
		echo 'NodeJS installed already';
	else
		echo 'Installing NodeJS';
		install_gcc();
		install_python();
		echo $PATH | grep -q "$HOME/local/bin" || $(echo "export PATH=$HOME/local/bin:$PATH" >> ~/.bashrc && . ~/.bashrc);
		mkdir -p ~/local/bin
		mkdir -p ~/node-latest-install
		cd ~/node-latest-install
		rm -R ./* ;
		curl http://nodejs.org/dist/node-latest.tar.gz | tar xz --strip-components=1
		./configure --prefix=$ABSOLUTE_HOME/local
		make install # ok, fine, this step probably takes more than 30 seconds...
		curl https://www.npmjs.org/install.sh | sh;
	fi
}



