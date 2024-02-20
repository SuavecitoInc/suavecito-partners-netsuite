/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as https from 'N/https';
import * as log from 'N/log';
import * as runtime from 'N/runtime';

export const afterSubmit: EntryPoints.UserEvent.afterSubmit = (
  context: EntryPoints.UserEvent.afterSubmitContext
) => {
  const RESTLET_SCRIPT_ID = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_partners_script_id' }) as string;

  const RESTLET_DEPLOY_ID = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_partners_deploy_id' }) as string;

  // do something
  try {
    const oldRecord = context.oldRecord;

    if (!oldRecord) {
      log.debug({
        title: 'Could not get oldRecord',
        details: JSON.stringify(oldRecord),
      });

      return;
    }

    const oldSalesRep = oldRecord.getText({
      fieldId: 'salesrep',
    });

    log.debug({
      title: 'OLD SALES REP',
      details: oldSalesRep,
    });

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

    log.debug({
      title: 'UPDATE SALES REP',
      details: oldSalesRep !== salesRep,
    });
    // update if true
    if (oldSalesRep !== salesRep) {
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
    } else {
      log.debug({
        title: 'NO SALES REP UPDATE NEEDED',
        details: { oldSalesRep, salesRep },
      });
    }
  } catch (error: any) {
    log.error({
      title: 'Something went wrong',
      details: error,
    });
  }
};
