# Practical 12 — Terraform infrastructure

This folder creates a **new** Ubuntu 22.04 EC2 instance and a dedicated security group for the Node.js Docker application. It does not import, modify, or delete the older manually-created `devops-lab` instance.

## Before applying

1. Install Terraform and the AWS CLI on Windows, or use an authenticated AWS CloudShell that has Terraform available.
2. Configure AWS credentials for a principal with EC2 permissions. Terraform reads the normal AWS credential chain/AWS CLI profile. Never put AWS access keys in `.tf`, `.tfvars`, GitHub, or this repository.
3. Copy `terraform.tfvars.example` to a local file named `terraform.tfvars` and set:
   - `key_name`: the existing EC2 Key Pair **name** in `us-east-1` that matches the private key stored in GitHub secret `EC2_SSH_KEY_B64`. This is not a `.pem` path or key contents.
   - `ssh_allowed_cidr`: preferably a trusted public IPv4 address with `/32`. A GitHub-hosted runner uses a different, changing source IP, so a restrictive home-IP rule will block SSH deployment. For a short lab test only, you may temporarily allow SSH from `0.0.0.0/0`; remove it immediately or destroy the lab resources after verification. Never leave broad SSH access open.
   - `ami_id` may remain empty; Terraform will select the latest official Ubuntu 22.04 LTS x86_64 AMI for the selected region.

The real `terraform.tfvars`, Terraform state, and `.terraform/` cache are ignored by Git. Commit `terraform.tfvars.example` instead. Do not commit `.pem` keys or state files.

## Windows PowerShell commands

From the cloned project folder, create and edit the local variables file:

```powershell
Copy-Item .\terraform\terraform.tfvars.example .\terraform\terraform.tfvars
notepad .\terraform\terraform.tfvars
```

Then run:

```powershell
cd .\terraform
terraform fmt
terraform init
terraform validate
terraform plan
terraform apply
```

Review the plan. It should create only a security group and an EC2 instance named `ci-node-demo-p12`; it must not propose deleting `devops-lab`. Type `yes` only after reviewing the plan. Save the `instance_ip` output.

## Connect the existing GitHub Actions workflow

After `terraform apply` succeeds:

1. Update GitHub repository secret `EC2_HOST` to the `instance_ip` output.
2. Set `EC2_USER` to `ubuntu`.
3. Ensure `EC2_SSH_KEY_B64` contains the base64-encoded private key corresponding to the `key_name` Key Pair.
4. Push the Terraform source files and README changes to `main`. The existing workflow tests the Node app, pushes the Docker image to Docker Hub, and deploys it through Docker Compose to `EC2_HOST`.
5. The security group exposes app TCP port 3000 publicly. PostgreSQL is not exposed by this Terraform security group.

The workflow uses GitHub-hosted runners; SSH port 22 must be reachable from its runner for deployment. Do not leave SSH open to all sources after the lab check. A permanent secure solution is an AWS Systems Manager/self-hosted-runner deployment or a managed runner with a controlled IP.

## Cleanup — required to avoid charges

After the instructor has checked the result, from this same `terraform` folder run:

```powershell
terraform destroy
```

Review the plan and type `yes`. This removes the Terraform-managed `ci-node-demo-p12` instance and its security group; it does not remove the older `devops-lab` instance. Verify deletion in **AWS Console → EC2 → Instances** and **Security Groups**. Do not delete the Terraform state until destroy has completed.
