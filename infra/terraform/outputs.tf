output "resource_group_name" {
  description = "Name of the main resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "ID of the main resource group"
  value       = azurerm_resource_group.main.id
}

output "resource_group_location" {
  description = "Location of the main resource group"
  value       = azurerm_resource_group.main.location
}
