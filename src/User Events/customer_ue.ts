/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as https from 'N/https';
import * as log from 'N/log';
import * as runtime from 'N/runtime';
import * as search from 'N/search';

export const afterSubmit: EntryPoints.UserEvent.afterSubmit = (
  context: EntryPoints.UserEvent.afterSubmitContext
) => {
  // TODO: move these to script params
  const ACTIVE_SALES_REPS = [262, 238, 239, 243, 148066, 8703396, 206, 254];

  const RESTLET_SCRIPT_ID = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_partners_script_id' }) as string;

  const RESTLET_DEPLOY_ID = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_partners_deploy_id' }) as string;

  try {
    const currentRecord = context.newRecord;

    if (!currentRecord) {
      log.debug({
        title: 'Could not get currentRecord',
        details: JSON.stringify(currentRecord),
      });

      return;
    }

    const customerEmail = currentRecord.getValue({
      fieldId: 'email',
    }) as string;

    log.debug({
      title: 'CUSTOMER EMAIL',
      details: customerEmail,
    });

    const salesRepId = currentRecord.getValue({
      fieldId: 'salesrep',
    }) as string;

    log.debug({
      title: 'SALES REP VALUE',
      details: salesRepId,
    });

    // get sales rep by id
    const salesRepLookup = search.lookupFields({
      type: search.Type.EMPLOYEE,
      id: salesRepId,
      columns: ['email', 'firstname', 'lastname', 'internalid'],
    });

    log.debug({
      title: 'SALES REP LOOKUP',
      details: salesRepLookup,
    });

    const salesRepInternalId = salesRepLookup.internalid[0].value as string;

    if (!ACTIVE_SALES_REPS.includes(parseInt(salesRepInternalId))) {
      log.debug({
        title: 'SALES REP EXCLUDED',
        details: salesRepLookup,
      });

      return;
    }

    // set salesRep email
    const salesRep = salesRepLookup.email as string;

    if (!salesRep) {
      log.debug({
        title: 'Could not get salesRep',
        details: JSON.stringify(salesRepLookup),
      });

      return;
    }

    log.debug({
      title: 'SALES REP',
      details: salesRep,
    });

    // fire http request here
    const restletResponse = https.requestRestlet({
      method: 'POST',
      body: JSON.stringify({
        customerEmail,
        salesRep,
      }),
      deploymentId: RESTLET_DEPLOY_ID, // 2
      headers: {
        'Content-Type': 'application/json',
      },
      // TODO: update this with RESTLet id and or pass this in as script param
      // deployment script external url
      scriptId: RESTLET_SCRIPT_ID, // 1718
    });

    log.debug({
      title: 'RESTLET RESPONSE',
      details: restletResponse,
    });

    log.debug({
      title: 'RESTLET RESPONSE BODY',
      details: JSON.parse(restletResponse.body),
    });
  } catch (error: any) {
    log.error({
      title: 'Something went wrong',
      details: error,
    });
  }
};
