/**
 *  Copyright (c) 1988-2019 deister software, All Rights Reserved.
 *
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to
 *  deister software and may be covered by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material is strictly
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed
 *  "Confidentiality and Non-disclosure" agreements explicitly covering such access.
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
 *
 * -----------------------------------------------------------------------------
 *
 *  FUNCTION JS: cxlstemplate2result
 *
 *  Version:       V1.0
 *  Date:          2023-12-11
 *  Description:   Excel sheet evaluation.
 *
 *  CALLED FROM:
 *  ==================
 *     Obj: cxlstemplate              Through the action 'ACTION_BUTTON_DFIELD'
 *
 *  PARAMETERS:
 *  ==================
 *
 *              @param    {String}    bal_code      Row identification code. XLS template.
 *              @param    {Object}    fdata         JSon object with initial evaluation parameters.
 *
 **/
function crp_cxlstemplate_result(bal_code, fdata) {

    // Load module
    var tplLib = require("templates_lib");

    // Load initial parameters return string.
    var xls_args = '';
    Object.keys(fdata).forEach( key => {
        xls_args += key + ":" +  fdata[key] + "; ";
    });

    // Load query data.
    var template = Ax.db.executeQuery(`
        <select>
            <columns>
                bal_code, bal_grpsql, bal_datasql, templ_type, templ_data
            </columns>
            <from table='cxlstemplate' />
            <where>
                bal_code = '${bal_code}'
            </where>
        </select>
    `).toOne().setRequired(`ID template: [${bal_code}] not found`);

    // Apply template to recognize parameteres
    var tpl_data = tplLib.makeTemplate(template.bal_datasql);
    var tpl_grp  = tplLib.makeTemplate(template.bal_grpsql);

    // xls treatment
    var wb = Ax.ms.Excel.load(template.templ_data);

    // Blob to save in memory each workbook result.
    var blob = new Ax.sql.Blob("data.txt");

    // Grouping query
    var obj_group =  Ax.db.executeQuery(tpl_grp(fdata)).toOne();
    // Return without rows.

    if(obj_group.file_name == null)
        return;

    // Update excel label (bal_grpql current row tags)
    for(const campo in obj_group){

        const cell = wb.getCellByName(campo);

        if (cell != null)
            cell.setCellValue(obj_group[campo]);
    }

    // get excel data
    var rs_data = Ax.db.executeQuery(tpl_data(tplLib.rowMap2JsMap(obj_group))).toMemory();

    // Update excel table label. (bal_datasql resultset)
    wb.update(rs_data, options => {
        options.setTableName("csaldos");
        options.setStartRow(wb.getNamedRow("csaldos") + 1);
        options.setEvaluate(true);
    });

    // Get information for header titles
    var rs_titulo = Ax.db.executeQuery(`
        <select> 
            <columns>
                MAX(CASE WHEN qs_calenda.numsem = 1 THEN TRIM(UPPER(cperiodo.nomper)) || ' ${fdata.ejerci}: Sem 1 (' || TO_CHAR(qs_calenda.fecini, '%d') || ' al ' || TO_CHAR(qs_calenda.fecfin, '%d') || ')'
                    END) titulo_sem_1,
                MAX(CASE WHEN qs_calenda.numsem = 2 THEN TRIM(UPPER(cperiodo.nomper)) || ' ${fdata.ejerci}: Sem 2 (' || TO_CHAR(qs_calenda.fecini, '%d') || ' al ' || TO_CHAR(qs_calenda.fecfin, '%d') || ')'
                    END) titulo_sem_2,
                MAX(CASE WHEN qs_calenda.numsem = 3 THEN TRIM(UPPER(cperiodo.nomper)) || ' ${fdata.ejerci}: Sem 3 (' || TO_CHAR(qs_calenda.fecini, '%d') || ' al ' || TO_CHAR(qs_calenda.fecfin, '%d') || ')'
                    END) titulo_sem_3,
                MAX(CASE WHEN qs_calenda.numsem = 4 THEN TRIM(UPPER(cperiodo.nomper)) || ' ${fdata.ejerci}: Sem 4 (' || TO_CHAR(qs_calenda.fecini, '%d') || ' al ' || TO_CHAR(qs_calenda.fecfin, '%d') || ')'
                    END) titulo_sem_4,
                MAX(CASE WHEN qs_calenda.numsem = 5 THEN TRIM(UPPER(cperiodo.nomper)) || ' ${fdata.ejerci}: Sem 5 (' || TO_CHAR(qs_calenda.fecini, '%d') || ' al ' || TO_CHAR(qs_calenda.fecfin, '%d') || ')'
                    END) titulo_sem_5,
                MAX(TRIM(UPPER(cperiodo.nomper)) || ' ${fdata.ejerci}') titulo_mes,
                MAX('CONSOLIDADO ${fdata.ejerci} (' || 'ENE - ' || SUBSTR(TRIM(UPPER(cperiodo.nomper)), 1, 3) || ')') titulo_consolidado
            </columns>
            <from table='cperiodo' >
                <join table='cempresa'>
                    <on>cperiodo.empcode = cempresa.empcode</on>
                </join>
                <join table="crp_tes_qs_calenda" alias='qs_calenda'>
                    <on>cperiodo.ejerci = qs_calenda.ejerci</on>
                    <on>cperiodo.codigo = qs_calenda.nummes</on>
                </join>
            </from>
            <where>
                cempresa.empcode MATCHES ('125')
                AND cperiodo.ejerci = ?
                AND cperiodo.codigo = ?
            </where>
        </select>
    `, fdata.ejerci, fdata.period).toOne();

    // Update excel label (rs_titulo current row tags)
    for(const campo in rs_titulo){

        const cell = wb.getCellByName(campo);
        if (cell != null)
            cell.setCellValue(rs_titulo[campo]);
    }

    // Evaluate
    wb.evaluate();

    // Add workbook to memory blob variable.
    blob.setContent(wb.toBlob().getBytes());

    Ax.db.insert("cxlsoutput", {
        xls_execid  : 0,
        bal_code    : bal_code,
        xls_name    : bal_code + '.xls',
        xls_args    : xls_args,
        xls_type    : 'application/xls',
        xls_size    : blob.getTextContent().length(),
        xls_output  : blob.getContent()
    });
}