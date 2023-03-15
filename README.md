# Suavecito Partners NetSuite

> customer_ue.ts -> SP_SalesRepUpdate.ts

After a customer submit it will look at the `sales rep` if it has changed it will fire a request to the `Sales Rep Update RESTLet` with the cusomter's `email` and `sales rep`. This will fire an http Request to a Server / Lambda that will handle the sales rep update in Shopify via the `Shopify GraphQL Api`.
