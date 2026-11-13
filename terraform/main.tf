terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.23"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Use the default VPC in the selected region. This keeps the lab setup simple.
data "aws_vpc" "default" {
  default = true
}

# If ami_id is left empty, select the latest official Ubuntu 22.04 LTS x86_64 AMI.
data "aws_ami" "ubuntu" {
  count       = var.ami_id == "" ? 1 : 0
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name = "name"
    values = [
      "ubuntu/images/hvm-ssd*/ubuntu-jammy-22.04-amd64-server-*"
    ]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

resource "aws_security_group" "nodeapp" {
  name        = "${var.project_name}-sg"
  description = "Security group for the Node.js Docker application"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH; restrict this CIDR to a trusted source where possible"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  ingress {
    description = "Node.js application"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow outbound traffic for package/image downloads"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-sg"
    Environment = "practical-12"
  }
}

resource "aws_instance" "nodeapp" {
  ami                         = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu[0].id
  instance_type               = var.instance_type
  key_name                    = var.key_name
  vpc_security_group_ids      = [aws_security_group.nodeapp.id]
  associate_public_ip_address = true

  tags = {
    Name        = var.project_name
    Environment = "practical-12"
  }
}
