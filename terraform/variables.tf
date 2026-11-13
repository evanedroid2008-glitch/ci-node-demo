variable "aws_region" {
  description = "AWS region where the lab resources will be created"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name prefix/tag for the Terraform-managed resources"
  type        = string
  default     = "ci-node-demo-p12"
}

variable "ami_id" {
  description = "Optional Ubuntu 22.04 AMI ID in aws_region; leave empty to select the latest official Canonical AMI"
  type        = string
  default     = ""
}

variable "instance_type" {
  description = "EC2 instance type for the practical"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Name of an existing EC2 Key Pair in aws_region; do not put a private key or local .pem path here"
  type        = string

  validation {
    condition     = length(trimspace(var.key_name)) > 0
    error_message = "Set key_name to the name of an existing EC2 Key Pair."
  }
}

variable "ssh_allowed_cidr" {
  description = "IPv4 CIDR allowed to connect to SSH (port 22). Use your trusted public IP/32 when possible."
  type        = string

  validation {
    condition     = can(cidrhost(var.ssh_allowed_cidr, 0))
    error_message = "ssh_allowed_cidr must be a valid IPv4 CIDR, for example 203.0.113.10/32."
  }
}
