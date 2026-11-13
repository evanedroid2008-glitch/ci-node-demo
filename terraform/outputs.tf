output "instance_ip" {
  description = "Public IPv4 address for the Terraform-managed EC2 instance"
  value       = aws_instance.nodeapp.public_ip
}

output "instance_id" {
  description = "ID of the Terraform-managed EC2 instance"
  value       = aws_instance.nodeapp.id
}

output "security_group_id" {
  description = "ID of the security group created for the Node.js application"
  value       = aws_security_group.nodeapp.id
}
