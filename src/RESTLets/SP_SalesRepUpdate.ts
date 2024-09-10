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

type ShopifyCustomer = {
  id: string;
  email: string;
  tags: string[];
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
  } catch (err: any) {
    log.error({
      title: 'ERROR UPDATING SALES REP',
      details: err.message,
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
async function getCustomer(email: string): Promise<ShopifyCustomer | null> {
  const query = `#graphql
    query Customers($email: String!) {
      customers(first: 1, query: $email) {
        edges {
          node {
            id
            email
            tags
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

    const responseBody = JSON.parse(response.body);
    log.debug({
      title: 'RESPONSE BODY',
      details: responseBody,
    });

    const { data, errors } = responseBody;

    if (errors && errors.length > 0) {
      throw new Error(errors);
    }

    log.debug({ title: 'CUSTOMER', details: data });

    // return flat
    log.debug({
      title: 'CUSTOMER NODE',
      details: data?.customers?.edges[0],
    });

    return data?.customers?.edges[0] ? data?.customers?.edges[0].node : null;
  } catch (err: any) {
    log.error({ title: 'ERROR', details: err.message });
    throw new Error(err.message);
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

    const { data, errors } = JSON.parse(response.body);

    if (errors && errors.length > 0) {
      throw new Error(errors);
    }
    log.debug({ title: 'SALES REPS OBJECTS', details: data.metaobjects });
    // return flat
    return data.metaobjects.edges.map(el => el.node);
  } catch (err: any) {
    log.error({
      title: 'ERROR GETTING SALES REPS (META OBJECT)',
      details: err,
    });
    throw new Error(err.message);
  }
}

const removeTags = async (customerId: string, tags: string[]) => {
  const query = `#graphql
    mutation RemoveTags($tags: [String!]!, $customerId: ID!) {
      tagsRemove(tags: $tags, id: $customerId) {
        node {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    tags,
    customerId,
  };

  try {
    const response = await shopifyAuthenticatedFetch(query, variables);
    return response;
  } catch (err: any) {
    log.error({
      title: 'ERROR REMOVING TAGS',
      details: err.message,
    });
    throw new Error(err.message);
  }
};

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
  const match = rep;
  // admin api: get customer by email
  const customer = await getCustomer(customerEmail);

  // no customer found return error
  if (!customer) {
    return {
      statusCode: 500,
      body: 'No Customer Found!',
    };
  }

  // get tag to remove if any
  const tags = customer.tags;
  // find tag with sales_rep
  const salesRepTagToRemove = tags.filter(tag => tag.includes('sales_rep:'));

  log.debug({
    title: 'SALES REP TAG TO REMOVE',
    details: salesRepTagToRemove,
  });

  if (salesRepTagToRemove.length > 0) {
    // remove sales rep tag
    await removeTags(customer.id, salesRepTagToRemove);
  }

  const salesReps = await getSalesReps();

  // set default sales rep
  let salesRep = salesReps.find(
    (rep: SalesRepType) => rep.handle === 'onboarding'
  );
  // // storefront api: get meta objects type sales_rep
  // find matching sales rep
  const found = salesReps.find(
    (rep: SalesRepType) => rep.email.value === match
  );
  if (found) {
    salesRep = found;
  }
  // // admin api: mutation - update sales rep
  const query = `#graphql
      mutation UpdateSalesRep($metafields: [MetafieldsSetInput!]!, $customerId: ID!, $tags: [String!]!) {
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
        tagsAdd(tags: $tags, id: $customerId) {
          node {
            id
          }
          userErrors {
            field
            message
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
    customerId: customer.id,
    tags: [salesRep.name.value, `sales_rep:${salesRep.name.value}`],
  };

  try {
    const response = await shopifyAuthenticatedFetch(query, variables);

    const json = JSON.parse(response.body);
    return json;
  } catch (err: any) {
    console.log('Error updating sales rep.', err);
    log.error({
      title: 'ERROR UPDATING SALES REP',
      details: err.message,
    });
    throw new Error(err.message as string);
  }
}
