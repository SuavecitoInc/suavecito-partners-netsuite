/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as https from 'N/https';
import * as log from 'N/log';

export const afterSubmit: EntryPoints.UserEvent.afterSubmit = (
  context: EntryPoints.UserEvent.afterSubmitContext
) => {
  // do something
  const oldRecord = context.oldRecord;
  const oldSalesRep = oldRecord.getText({
    fieldId: 'salesrep',
  });

  log.debug({
    title: 'OLD SALES REP',
    details: oldSalesRep,
  });

  const currentRecord = context.newRecord;

  const customerEmail = currentRecord.getValue({
    fieldId: 'email',
  });

  log.debug({
    title: 'CUSTOMER EMAIL',
    details: customerEmail,
  });

  const salesRep = currentRecord.getText({
    fieldId: 'salesrep',
  });

  log.debug({
    title: 'NEW SALES REP',
    details: salesRep,
  });

  // TODO: handle no update needed event

  if (oldSalesRep !== salesRep) {
    log.debug({
      title: 'UPDATE SALES REP',
      details: oldSalesRep !== salesRep,
    });
  }

  log.debug({
    title: 'GETTING SALES REP',
    details: salesRep,
  });

  // fire http request here
  const restletResponse = https.requestRestlet({
    method: 'POST',
    body: JSON.stringify({
      customerEmail,
      salesRep,
    }),
    deploymentId: '1',
    headers: {
      'Content-Type': 'application/json',
    },
    // TODO: update this with RESTLet id and or pass this in as script param
    scriptId: '1594',
  });

  log.debug({
    title: 'RESTLET RESPONSE',
    details: restletResponse,
  });

  log.debug({
    title: 'RESTLET RESPONSE BODY',
    details: JSON.parse(restletResponse.body),
  });
};
