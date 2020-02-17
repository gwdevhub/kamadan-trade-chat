#!/bin/bash

repository_code_location=$4
# Create config file to disable host key checking (stops prompt to allow remote host)
test mkdir -p ~/.ssh/
config_file=~/.ssh/config
test touch $config_file
test chmod 600 $config_file
test chown -R $USER:$USER $config_file
echo "Setting StrictHostKeyChecking no in $config_file..."
[[ -z $(grep "StrictHostKeyChecking" $config_file) ]] && cat << 'EOF' >> $config_file
StrictHostKeyChecking no
EOF

# Copy our ppk file into is_rsa
key_file=~/.ssh/git_key
echo "Copying $3 into $key_file..."
mkdir -p ~/.ssh/
cp -ur $3 $key_file
chmod 600 $key_file
chown -R $USER:$USER $key_file

# Add if not already added
eval `ssh-agent -s`
[[ -z $(ssh-add -L | grep $key_file) ]] && ssh-add $key_file

git_dir="/vagrant"
echo "Cloning/Pulling from $1 ($2) to $git_dir/srv..."
#PKG_OK=$(dpkg-query -W --showformat='${Status}\n' git|grep "install ok installed")
#if [ "" == "$PKG_OK" ]; then
if git --version | grep -q "git version"; then
	# Git present OK
else
  echo "No git package, installing."
  test sudo apt-get update
  test sudo apt-get --no-upgrade -y -q install git
fi
mkdir -m 777 $git_dir


if [ ! -d "$git_dir/.git" ]; then
	test git clone $1 $git_dir --depth=1 --single-branch --verbose --branch=$2
fi
cd $git_dir
test git config --global core.autocrlf input
test git fetch
test git reset --hard $2
test git clean -fdx
test git pull || (git checkout $2 && git pull)
test chmod -R 777 $git_dir
test chown -R www-data:www-data $git_dir

# Finally, copy/update /srv folder
echo "Copying pulled Git code from $git_dir/ to $repository_code_location/..."
mkdir -p -m 775 $repository_code_location/
cp -ura $git_dir/* $repository_code_location/

# Delete sensitive bits
rm $repository_code_location/Vagrantfile
rm -R $repository_code_location/.git
rm -R $repository_code_location/.vagrant
rm -R $repository_code_location/ssh
rm -R $repository_code_location/VagrantConfig

echo "Git code is now LIVE"

function test {
    "$@"
    local status=$?
    if [ $status -ne 0 ]; then
        echo "error with $@" >&2
		exit $status
    fi
    return $status
}