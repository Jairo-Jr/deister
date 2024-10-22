/**
 *  Copyright (c) 1988-PRESENT deister software, All Rights Reserved.
 * 
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to 
 *  deister software and may be covered by trade secret or copyright law. 
 *  Dissemination of this information or reproduction of this material is strictly 
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed 
 * "Confidentiality and Non-disclosure" agreements explicitly covering such access.
 *  The copyright notice above does not evidence any actual or intended publication 
 *  for disclosure of this source code, which includes information that is confidential 
 *  and/or proprietary, and is a trade secret, of deister software
 * 
 *  ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
 *  OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT THE 
 *  EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION
 *  OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.THE RECEIPT OR POSSESSION OF 
 *  THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY
 *  RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE, 
 *  USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART.
 * 
 *  -----------------------------------------------------------------------------
 *  JS: pe_padron_get_charge_file
 *      Version:    V1.15
 *      Date:       2023.03.13                                          
 *      Description: Get file and charge data in tables       
 * 
 * 
 * 
 */
function pe_padron_get_charge_file() {
     
    var mDateToday = new Ax.util.Date();
    
    var mProcesoAbierto = Ax.db.executeQuery(`
        <select>
            <columns>
                log_id
            </columns>
            <from table='clogproh'/>
            <where>
                log_procname = 'pe_padron_get_charge_file'
                AND log_date_end IS NULL
            </where>
        </select> 
    `).toOne();
    // TODO: Actualizar de frente, sin necesidad de una select
    if(mProcesoAbierto.log_id) {
        Ax.db.update("clogproh", 
            {
                log_date_end: mDateToday
            }, {
                log_id: mProcesoAbierto.log_id
            }
        );
    }

    mObjProcLog = require('clogproh');

    // TODO: Sin el begin y commit work
    Ax.db.beginWork();
    mObjProcLog.start('pe_padron_get_charge_file', 'pe_sunat_padron_file', 1);
    Ax.db.commitWork();

    mIntLogId = mObjProcLog.getLogId();

    function __getRsClogProh(pStrLogId){
        return Ax.db.executeQuery(`
            <select>
                <columns>
                    clogprol.log_fieldc_1, 
                    clogprol.log_message,
                    CAST(clogprol.log_date AS DATE) <alias name='log_date' />
                </columns>
                <from table='clogprol' />
                <where>
                    clogprol.log_id = ?
                </where>
            </select>
        `, pStrLogId);
    }
    
    var mArrSources = Ax.db.executeQuery(`
        <select>
            <columns>
                pe_sunat_padron_parameters.file_source
            </columns>
            <from table='pe_sunat_padron_parameters' />
            <where>
                pe_sunat_padron_parameters.param_url != ''
            </where>
        </select>
    `);

    // TODO: Analizar el try
    for (var mStrSource of mArrSources) {
        try {
            Ax.db.beginWork();

            Ax.db.call('pe_sunat_padron_get_source', mStrSource.file_source);
            mObjProcLog.log(`[${mStrSource.file_source}] se descargó correctamente`, null, null, null, mStrSource.file_source, null, 1, null);

            Ax.db.commitWork();
        } catch (error) {
            Ax.db.rollbackWork();

            mObjProcLog.err(`${error.message || error}`, '', mStrSource.file_source, null, 0, null);
        }
    }

    var mObjPadronFiles = Ax.db.executeQuery(`
        <select>
            <columns>
                pe_sunat_padron_file.file_id,
                pe_sunat_padron_file.file_source
            </columns>
            <from table='pe_sunat_padron_file' />
            <where>
                pe_sunat_padron_file.file_status = 'P' AND
                pe_sunat_padron_file.file_insert = 'URL'
            </where>
        </select>
    `);

    try {
        Ax.db.beginWork();

        for (var mObjPadronFile of mObjPadronFiles) {
            if (mObjPadronFile.file_source == 'EEP' || mObjPadronFile.file_source == 'CNA') {
                try {
                    Ax.db.beginWork();
    
                    Ax.db.call('pe_sunat_padron_load_source_xls', mObjPadronFile.file_id);
                    mObjProcLog.log(`[${mObjPadronFile.file_source}] cargado`, null, null, null, mObjPadronFile.file_source, null, 1, null);
    
                    Ax.db.commitWork();
                } catch (error) {
                    Ax.db.rollbackWork();
    
                    mObjProcLog.err(`${error.message || error}`, '', null, null, 0, null);
                }
            } else {
                try {
                    Ax.db.beginWork();
    
                    Ax.db.call('pe_sunat_padron_reader_padron', mObjPadronFile.file_id);
                    mObjProcLog.log(`[${mObjPadronFile.file_source}] cargado`, null, null, null, mObjPadronFile.file_source, null, 1, null);
    
                    Ax.db.commitWork();
                } catch (error) {
                    Ax.db.rollbackWork();
    
                    mObjProcLog.err(`${error.message || error}`, '', mObjPadronFile.file_source, null, 0, null);
                }
            }
            Ax.db.commitWork();
        }
        Ax.db.commitWork();

        try {
            Ax.db.beginWork();

            let mIntNum = Ax.db.call('pe_process_ctax_terkey_update', 'ALL');
            mObjProcLog.log(`${mIntNum} actualizadas`, null, null, null, 'Clave fiscal', null, 1, null);

            Ax.db.commitWork();
        } catch (error) {
            Ax.db.rollbackWork();

            mObjProcLog.err(`${error.message || error}`, '', null, null, 0, null);
        }
        
    } catch (error) {
        Ax.db.rollbackWork();

        mObjProcLog.err(`${error.message || error}`, '', mObjPadronFile.file_source, null, 0, null);
    }

    mObjProcLog.end();
    
    return __getRsClogProh(mIntLogId);
}


201001218090000940901F80100003459    1  1403500301    CONSULTA O INTERCONSULTA DIURNA,POR ESPECIALISTA                      202402290136884 107516870       28          55.56        0.00        0.00     1555.80        0.00I77.0A02