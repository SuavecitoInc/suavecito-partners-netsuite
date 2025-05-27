/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as https from 'N/https';
import * as runtime from 'N/runtime';
import * as log from 'N/log';
import * as crypto from 'N/crypto';
import * as encode from 'N/encode';

type ContextType = {
  customerEmail: string;
  salesRep: string;
};

async function createSignature(body: any) {
  const apiKeyId = runtime.getCurrentScript().getParameter({
    name: 'custscript_sp_sales_rep_secret_id',
  }) as string;

  // create hmac
  const secretKey = crypto.createSecretKey({
    guid: apiKeyId,
    encoding: crypto.Encoding.UTF_8,
  });

  log.debug({
    title: 'Secret Key',
    details: secretKey,
  });

  const hmac = crypto.createHmac({
    algorithm: crypto.HashAlg.SHA256,
    key: secretKey,
  });

  hmac.update({
    input: JSON.stringify(body),
    inputEncoding: encode.Encoding.UTF_8,
  });

  const digest = hmac.digest({
    outputEncoding: encode.Encoding.BASE_64,
  });

  log.debug({
    title: 'HMAC Signature',
    details: digest,
  });

  return digest;
}

async function updateSalesRep(email: string, salesRep: string) {
  const endpoint = runtime.getCurrentScript().getParameter({
    name: 'custscript_sp_sales_rep_endpoint',
  }) as string;

  const data = {
    email,
    salesRep,
  };

  const signature = await createSignature(data);

  const response = await https.post.promise({
    url: endpoint,
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      'X-Suavecito-Hmac-Sha256': signature,
    },
  });

  return response;
}

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
    log.debug({
      title: 'RESPONSE FROM SERVER (LAMBDA)',
      details: response,
    });
    return response;
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
