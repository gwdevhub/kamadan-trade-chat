# Use the official image as a parent image
FROM ubuntu:22.04

# Update the system
RUN apt-get update && apt-get upgrade -y

# Install OpenSSH Server
RUN apt-get install -y openssh-server

# Set up configuration for SSH
RUN mkdir /var/run/sshd
RUN echo 'root:password' | chpasswd
RUN sed -i 's/PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
RUN sed -i 's/PermitRootLogin without-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Uncomment
RUN sed -i 's/#PermitRootLogin yes/PermitRootLogin yes/' /etc/ssh/sshd_config

# SSH login fix. Otherwise, user is kicked off after login
RUN sed 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' -i /etc/pam.d/sshd

ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile

# Expose the SSH port
EXPOSE 22
EXPOSE 80
EXPOSE 3306

# Run SSH
CMD ["/usr/sbin/sshd", "-D"]