/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as https from 'N/https';
import * as crypto from 'N/crypto';
import * as encode from 'N/encode';
import * as runtime from 'N/runtime';
import * as log from 'N/log';

type ContextType = {
  customerEmail: string;
  salesRep: string;
};

export const post: EntryPoints.RESTlet.post = (context: ContextType) => {
  log.debug({
    title: 'CONTEXT POST',
    details: context,
  });

  // const body = JSON.parse(context);
  const body = context;

  const customerEmail = body.customerEmail;
  const salesRep = body.salesRep;

  if (!body.customerEmail) {
    return JSON.stringify({
      error: 'No customer email provided',
    });
  }

  // post to server
  // TODO: create lambda and move url to a script param
  // const url = runtime.getCurrentScript().getParameter({ name: '' });
  const url = 'https://d071-137-25-251-176.ngrok.io/test';

  log.debug({
    title: 'SENDING POST REQUEST TO SERVER',
    details: { customerEmail, salesRep },
  });

  try {
    // create hmac
    const mySecret = 'custsecret_sp_shopify_sales_rep_update'; //secret id take from secrets management page

    const body = JSON.stringify({ customerEmail, salesRep });
    log.debug({
      title: 'INPUT STRING',
      details: body,
    });

    const sKey = crypto.createSecretKey({
      secret: mySecret,
      encoding: encode.Encoding.UTF_8,
    });

    const hmacSha256 = crypto.createHmac({
      // algorithm: 'SHA512',
      algorithm: crypto.HashAlg.SHA256,
      key: sKey,
    });

    hmacSha256.update({
      input: body, // input string
      inputEncoding: encode.Encoding.UTF_8,
    });

    const digestSha256 = hmacSha256.digest({
      outputEncoding: encode.Encoding.BASE_64,
    });

    // post request
    const response = https.post({
      url: url,
      body: body,
      headers: {
        'Content-Type': 'application/json',
        // TODO: agree on header name
        'Some-Custom-Header': digestSha256,
      },
    });

    log.debug({
      title: 'RESPONSE',
      details: response,
    });

    const json = JSON.parse(response.body);

    log.debug({
      title: 'JSON RESPONSE',
      details: json,
    });

    return json;
  } catch (err: unknown) {
    log.debug({
      title: 'ERROR POSTING TO SERVER',
      details: err,
    });

    return JSON.stringify({
      error: err,
    });
  }
};
