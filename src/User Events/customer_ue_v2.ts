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
  const EXCLUDED_SALES_REPS = [
    'Amazon Store',
    'Barber Cart',
    'Central Region',
    'Cerveza Cito',
    'Customer Retention',
    'Eastern Region',
    'eBay Store',
    'Elmer Cayetano',
    'Enterprise',
    'Franchise',
    'Jamie Castillo',
    'Jose Oliveros',
    'Leslie Paredes',
    'Lolly Portela',
    'Nick Ramirez',
    'On-Boarding',
    'Online Store',
    'Partner Store',
    'Pilar Vega',
    'Professionals Store',
    'Retail Store',
    'Suavecito IT',
    'TKG',
    'TKGI',
    'Walmart Store',
    'Warehouse Store',
    'Western Region',
  ];

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
      columns: ['email', 'firstname', 'lastname'],
    });

    log.debug({
      title: 'SALES REP LOOKUP',
      details: salesRepLookup,
    });

    const salesRep = salesRepLookup.email as string;

    if (!salesRep) {
      log.debug({
        title: 'Could not get salesRep',
        details: JSON.stringify(salesRep),
      });

      return;
    }

    if (EXCLUDED_SALES_REPS.includes(salesRep)) {
      log.debug({
        title: 'SALES REP EXCLUDED',
        details: salesRep,
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
