#!/bin/bash
# Outputs IP Addresses of all project Vagrant machines to a JSON file where applicable.
file_name="server_list.json"
vagrant_status=$(vagrant status)
vagrant_machines=$(echo -e "${vagrant_status}" | grep -E '.*\(\w+\)[[:space:]]*$')
echo "$vagrant_machines"

json='['
i=0
while read machine; do 
	if [ $i != 0 ]; then
		json="$json,"
	fi
	i+=1
	machine_name=$(echo "${machine}" | grep -o -E '^\w+')
	machine_status=$(echo "${machine}" | grep -o -E '  [^\(]*' | grep -o -E '\w.*')
	machine_type=$(echo "${machine}" | grep -o -E '\(\w+\)' | grep -E -o '\w+')
	vagrant_ssh_res="HostName 0.0.0.0"
	if echo "${machine_status}" | grep -i -q -E 'active'; then
		vagrant_ssh_res=$(vagrant ssh-config $machine_name 2>/dev/null || echo "HostName 0.0.0.0")
		#echo -e "$vagrant_ssh_res"
	fi
	machine_ip_address=$(echo -e "${vagrant_ssh_res}" | grep -E -o 'HostName[ ]+([0-9]{1,3}.?){4}' | grep -P -o '([0-9]{1,3}.?){4}')
	#echo $machine_ip_address
	machine_json="{\n\tname:\"$machine_name\",\n\ttype:\"$machine_type\",\n\tstatus:\"$machine_status\",\n\tip_address:\"${machine_ip_address}\"\n}"
	json=$json$machine_json
done  <<< $vagrant_machines
original_hash=$(md5sum "${file_name}" | grep -P -o '^.{32}')
echo -e "$json]" > "${file_name}"
new_hash=$(md5sum "${file_name}" | grep -P -o '^.{32}')
echo "Original/New = ${original_hash}/${new_hash}"