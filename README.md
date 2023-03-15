# Suavecito Partners NetSuite

> customer_ue.ts -> SP_SalesRepUpdate.ts

After a customer submit it will look at the `sales rep` if it has changed it will fire a request to the `Sales Rep Update RESTLet` with the cusomter's `email` and `sales rep`. This will fire an http Request to a Server / Lambda that will handle the sales rep update in Shopify via the `Shopify GraphQL Api`.

## Verification

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
