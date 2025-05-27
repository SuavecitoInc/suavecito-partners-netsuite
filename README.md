# Suavecito Partners NetSuite

> customer_ue.ts -> SP_SalesRepUpdate.ts

After a customer submit it will look at the `sales rep`, if it has changed it will fire a request to the `Sales Rep Update RESTLet` with the customer's `email` and `sales rep`. This will fire a request to update the sales rep in Shopify via the `Shopify GraphQL API`.

## User Event Script Parameters

<table>
  <tr>
    <th>RESTLet Script ID</th>
    <td>The RESTLet Script ID. This can be found by looking at the RESTLets external url.</td>
  </tr>
    <tr>
    <th>RESTLet Deploy ID</th>
    <td>The RESTLet Script ID. This can be found by looking at the RESTLets external url.</td>
  </tr>
</table>

## RESTLet Script Parameters

<table>
  <tr>
    <th>Shopify Admin Token</th>
    <td>The Shopify Admin Token for Suavecito Partners</td>
  </tr>
  <tr>
    <th>Shopify Store Name</th>
    <td>The Shopify store name ex: suavecito-wholesale</td>
  </tr>
  <tr>
    <th>Shopify API VERSION</th>
    <td>The Shopify Admin API Version ex: 2023-07</td>
  </tr>
</table>

## Handle Shopify API Externally

> customer_ue.ts -> SP_SalesRepUpdate_External.ts

After a customer submit it will look at the `sales rep`, if it has changed it will fire a request to the `Sales Rep Update RESTLet` with the customer's `email` and `sales rep`. This will fire an http Request to a Server / Lambda that will handle the sales rep update in Shopify via the `Shopify GraphQL API`.

### External Verification

> Verification between NetSuite and the server / lambda can be handled with middleware. Example below is for an express server. It will have to be modified slightly for a Lambda.

```typescript
function verify(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const inputString = JSON.stringify(req.body);
  // key will be
  const key = process.env.SECRET_KEY;
  const hmac = req.get('some-custom-header');
  const hash = crypto
    .createHmac('sha256', key)
    .update(inputString, 'utf8')
    .digest('base64');
  if (hmac === hash) {
    console.log('+++++++++++++++++ REQUEST VERIFIED +++++++++++++++++>');
    next();
  } else {
    console.log('+++++++++++++++++ ERROR - FORBIDDEN +++++++++++++++++>');
    res.sendStatus(403);
  }
}
```
