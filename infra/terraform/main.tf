terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-vantage-portal-tfstate"
    storage_account_name = var.tf_state_storage_account
    container_name       = "tfstate"
    key                  = "vantage-portal.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# -------------------------------------------------------
# Resource Group
# -------------------------------------------------------

resource "azurerm_resource_group" "main" {
  name     = "rg-vantage-portal-${var.environment}"
  location = var.location

  tags = {
    project     = "vantage-portal"
    environment = var.environment
    managed_by  = "terraform"
  }
}
