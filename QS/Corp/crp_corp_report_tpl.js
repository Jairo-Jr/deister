function crp_corp_report_tpl(bal_code, fdata) {

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
    var rs_group =  Ax.db.executeQuery(tpl_grp(fdata)).toMemory();

    // Return without rows.
    var control = false;

    // Iterate grouping query.
    for (var row of rs_group) {

        control = true;

        // get excel data
        var rs_data = Ax.db.executeQuery(tpl_data(tplLib.rowMap2JsMap(row))).toMemory();

        // xls treatment
        var wb = Ax.ms.Excel.load(template.templ_data);

        // Update excel table label. (bal_datasql resultset)
        wb.update(rs_data, options => {
            options.setTableName("csaldos");
            options.setStartRow(wb.getNamedRow("csaldos") + 1);
            options.setEvaluate(true);
        });

        // Update excel label (bal_grpql current row tags)
        for(const campo in row){
            const cell = wb.getCellByName(campo);
            if (cell != null)
                cell.setCellValue(row[campo]);
        }

        // Evaluate
        wb.evaluate();

        // Add workbook to memory blob variable.
        blob.setContent(wb.toBlob().getBytes());
    }

    if(!control)
        return;

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

var data = {
    empcode:'*',
    period:1,
    proyec:'*',
    seccio:'*',
    ejerci:2024,
    sistem:'*'
}
return crp_corp_report_tpl('corp_report_tpl', data)