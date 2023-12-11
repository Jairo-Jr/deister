function cxlstemplate2result(bal_code, fdata) {

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

    // Blob to save in memory each workbook result.
    var blob = new Ax.sql.Blob("data.txt");

    // Grouping query
    var obj_group =  Ax.db.executeQuery(tpl_grp(fdata)).toOne();
    // Return without rows.

    if(obj_group.file_name == null)
        return;

    console.log(obj_group);
    // xls treatment
    var wb = Ax.ms.Excel.load(template.templ_data);

    // get excel data
    var rs_data = Ax.db.executeQuery(tpl_data(tplLib.rowMap2JsMap(obj_group))).toMemory();
    // console.log(rs_data);
    // Update excel label (bal_grpql current row tags)
    for(const campo in obj_group){

        const cell = wb.getCellByName(campo);

        if (cell != null)
            cell.setCellValue(obj_group[campo]);
    }

    // Update excel table label. (bal_datasql resultset)
    wb.update(rs_data, options => {
        options.setTableName("csaldos");
        options.setStartRow(wb.getNamedRow("csaldos") + 1);
        options.setEvaluate(true);
    });

    var rs_titulo = Ax.db.executeQuery(`
        <select> 
            <columns>
                MAX(CASE WHEN qs_calenda.numsem = 1 THEN TRIM(UPPER(cperiodo.nomper)) || ' ${obj_group.ejerci}: Sem 1 (' || TO_CHAR(qs_calenda.fecini, '%d') || ' al ' || TO_CHAR(qs_calenda.fecfin, '%d') || ')'
                    END) titulo_sem_1,
                MAX(CASE WHEN qs_calenda.numsem = 2 THEN TRIM(UPPER(cperiodo.nomper)) || ' ${obj_group.ejerci}: Sem 2 (' || TO_CHAR(qs_calenda.fecini, '%d') || ' al ' || TO_CHAR(qs_calenda.fecfin, '%d') || ')'
                    END) titulo_sem_2,
                MAX(CASE WHEN qs_calenda.numsem = 3 THEN TRIM(UPPER(cperiodo.nomper)) || ' ${obj_group.ejerci}: Sem 3 (' || TO_CHAR(qs_calenda.fecini, '%d') || ' al ' || TO_CHAR(qs_calenda.fecfin, '%d') || ')'
                    END) titulo_sem_3,
                MAX(CASE WHEN qs_calenda.numsem = 4 THEN TRIM(UPPER(cperiodo.nomper)) || ' ${obj_group.ejerci}: Sem 4 (' || TO_CHAR(qs_calenda.fecini, '%d') || ' al ' || TO_CHAR(qs_calenda.fecfin, '%d') || ')'
                    END) titulo_sem_4,
                MAX(CASE WHEN qs_calenda.numsem = 5 THEN TRIM(UPPER(cperiodo.nomper)) || ' ${obj_group.ejerci}: Sem 5 (' || TO_CHAR(qs_calenda.fecini, '%d') || ' al ' || TO_CHAR(qs_calenda.fecfin, '%d') || ')'
                    END) titulo_sem_5,
                MAX(TRIM(UPPER(cperiodo.nomper)) || ' ${obj_group.ejerci}') titulo_mes,
                MAX('CONSOLIDADO ${obj_group.ejerci} (' || 'ENE - ' || SUBSTR(TRIM(UPPER(cperiodo.nomper)), 1, 3) || ')') titulo_consolidado
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
    `, obj_group.ejerci, obj_group.period).toOne();
    console.log(rs_titulo);

    // Update excel label (bal_grpql current row tags)
    for(const campo in rs_titulo){

        console.log(campo);
        const cell = wb.getCellByName(campo);
        if (cell != null)
            cell.setCellValue(rs_titulo[campo]);
    }

    // Update excel table label. (bal_datasql resultset)
    // wb.update(rs_titulo, options => {
    //     options.setTableName("csaldos");
    //     options.setStartRow(wb.getNamedRow("csaldos") + 1);
    //     options.setEvaluate(true);
    // });



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

var fdata = {
    empcode: '125',
    ejerci: 2023,
    period: 12,
    moneda: 'PEN',
    unidad: 1
}

return cxlstemplate2result('cashflow_crp_month', fdata)