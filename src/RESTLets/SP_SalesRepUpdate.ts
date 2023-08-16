/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as https from 'N/https';
import * as runtime from 'N/runtime';
import * as log from 'N/log';

type ContextType = {
  customerEmail: string;
  salesRep: string;
};

export const post: EntryPoints.RESTlet.post = async (context: ContextType) => {
  log.debug({
    title: 'CONTEXT POST',
    details: context,
  });

  const body = context;

  const customerEmail = body.customerEmail;
  const salesRep = body.salesRep;

  if (!body.customerEmail) {
    return JSON.stringify({
      error: 'No customer email provided',
    });
  }

  log.debug({
    title: 'SENDING POST REQUEST TO SERVER',
    details: { customerEmail, salesRep },
  });

  // send request
  try {
    const response = await updateSalesRep(customerEmail, salesRep);
    return {
      statusCode: 200,
      body: response,
    };
  } catch (err: unknown) {
    log.debug({
      title: 'ERROR UPDATING SALES REP',
      details: err,
    });
    return {
      statusCode: 500,
      body: err,
    };
  }
};

function handleize(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-$/, '')
    .replace(/^-/, '');
}

async function shopifyAuthenticatedFetch(
  query: string,
  variables?: { [key: string]: any }
) {
  // TODO: move these to params
  const SHOPIFY_ADMIN_TOKEN = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_partners_admin_token' });

  const SHOPIFY_DOMAIN = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_partners_store_name' });

  const API_VERSION = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_partners_store_api_version' });

  const ADMIN_API_ENDPOINT = `https://${SHOPIFY_DOMAIN}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;

  const response = await https.post.promise({
    url: ADMIN_API_ENDPOINT,
    body: JSON.stringify({ query, variables }),
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
    },
  });

  return response;
}

// admin api fetch
async function getCustomer(email: string) {
  const query = `#graphql
    query Customers($email: String!) {
      customers(first: 1, query: $email) {
        edges {
          node {
            id
            email
          }
        }
      }
    }
  `;

  const variables = {
    email,
  };

  try {
    const response = await shopifyAuthenticatedFetch(query, variables);

    const { data } = JSON.parse(response.body);
    log.debug({ title: 'CUSTOMER', details: data });

    // return flat
    log.debug({
      title: 'CUSTOMER NODE',
      details: data?.customers?.edges[0],
    });

    return data?.customers?.edges[0] ? data?.customers?.edges[0].node : null;
  } catch (err: unknown) {
    log.debug({ title: 'ERROR', details: err });
    throw err;
  }
}

// admin api fetch
async function getSalesReps() {
  const query = `#graphql
    query {
      metaobjects(type: "sales_rep", first: 25) {
        edges {
          node {
            id
            handle
            email: field(key: "email") {
              value
            }
            image: field(key: "image") {
              value
              reference {
                ... on MediaImage {
                  id
                  image {
                    url
                    width
                    height
                  }
                }
              }
            }
            name: field(key: "name") {
              value
            }
            phone: field(key: "phone") {
              value
            }
            extension: field(key: "phone_extension") {
              value
            }
          }
        }
      }
    }
  `;

  try {
    const response = await shopifyAuthenticatedFetch(query);

    const { data } = JSON.parse(response.body);
    log.debug({ title: 'SALES REPS OBJECTS', details: data.metaobjects });
    // return flat
    return data.metaobjects.edges.map(el => el.node);
  } catch (err: unknown) {
    log.debug({
      title: 'ERROR GETTING SALES REPS (META OBJECT)',
      details: err,
    });

    throw err;
  }
}

type SalesRepType = {
  id: string;
  handle: string;
  email: {
    value: string;
  };
  image: {
    value: string;
    reference: {
      id: string;
      image: {
        url: string;
        width: number;
        height: number;
      };
    };
  };
  phone: {
    value: string;
  };
  extension?: {
    value: string;
  };
};

// admin api
async function updateSalesRep(customerEmail: string, rep: string) {
  // handleize sales rep name
  const match = handleize(rep);
  // admin api: get customer by email
  const customer = await getCustomer(customerEmail);

  // no customer found return error
  if (!customer) {
    return {
      statusCode: 500,
      body: 'No Customer Found!',
    };
  }

  const salesReps = await getSalesReps();

  // set default sales rep
  let salesRep = salesReps.find(
    (rep: SalesRepType) => rep.handle === 'onboarding'
  );
  // // storefront api: get meta objects type sales_rep
  // find matching sales rep
  const found = salesReps.find((rep: SalesRepType) => rep.handle === match);
  if (found) {
    salesRep = found;
  }
  // // admin api: mutation - update sales rep
  const query = `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            namespace
            value
            createdAt
            updatedAt
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;

  const variables = {
    metafields: [
      {
        key: 'sales_rep',
        namespace: 'suavecito',
        ownerId: customer.id,
        type: 'metaobject_reference',
        value: salesRep.id,
      },
    ],
  };

  try {
    const response = await shopifyAuthenticatedFetch(query, variables);

    const json = JSON.parse(response.body);
    return json;
  } catch (err: unknown) {
    console.log('Error updating sales rep.', err);
    log.debug({
      title: 'ERROR UPDATING SALES REP',
      details: err,
    });
    throw err;
  }
}
