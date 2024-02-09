function crp_cashflow_qs_week(bal_code, fdata) {

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

    /**
     * Registro de temporal con 60 semanas, que se usaran para comparar
     * con el calendario designado por CRP
     */
    let mTmpNumSemQS = Ax.db.getTempTableName('tmp_num_sem_qs');
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpNumSemQS}`);

    Ax.db.execute(`
            CREATE TEMP TABLE ${mTmpNumSemQS} (
                num_mes     INTEGER,
                num_sem     INTEGER
            )          
        `);

    for(var i = 1; i <= 12; i++){
        for(var j = 1; j <= 5; j++){
            Ax.db.insert(mTmpNumSemQS, { num_mes: i, num_sem: j });
        }
    }

    fdata.mTmpNumSemQS = mTmpNumSemQS;
    console.log(fdata);
    /** FLUJOS */
        // get excel data
        // var rs_data = Ax.db.executeQuery(tpl_data(tplLib.rowMap2JsMap(obj_group))).toMemory();
    var rs_data = Ax.db.executeQuery(tpl_data(fdata)).toMemory();

    let mRsPivot = rs_data.pivot(options => {
        options.setPivotColumnNames(['semana']);
        options.setMeasureColumnNames(['impflu']);
    });

    // return mRsPivot;



    var mRsOutput = new Ax.rs.Reader().memory(options => {
        options.setColumnNames([
            'codflu', 'nomflu'
        ]);
        options.setColumnTypes([
            Ax.sql.Types.CHAR, Ax.sql.Types.CHAR
        ]);
    });

    for (let i = 1; i <= 60; i++) {
        mRsOutput.cols().add(`sem_${i}`, Ax.sql.Types.DOUBLE);
    }

    for (let array of mRsPivot.toArray()) {
        mRsOutput.rows().add(array);
    }
    // return mRsOutput
    /** FLUJOS */



    /** CUENTAS BANC */
    var mTmpCtaFin = Ax.db.getTempTableName(`tmp_cbancpro_x_sem`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpCtaFin}`);
    Ax.db.execute(`
            <select intotemp='${mTmpCtaFin}'>
                <columns>
                    cbancpro.ctafin,
                    cbancpro.nomcta,

                    NVL(crp_calenda.nummes, ${mTmpNumSemQS}.num_mes) num_mes,
                    NVL(crp_calenda.numsem, ${mTmpNumSemQS}.num_sem) num_sem,

                    NVL(crp_calenda.semana, ${mTmpNumSemQS}.num_mes || '_' || ${mTmpNumSemQS}.num_sem) semana,
                    crp_calenda.fecini,
                    
                    cbancpro.moneda,

                    SUM(CASE WHEN taptcuen.fecope BETWEEN crp_calenda.fecini AND crp_calenda.fecfin
                            OR taptcuen.fecope &lt; crp_calenda.fecini THEN taptcuen.impcta
                            ELSE 0
                    END) impflu

                </columns>
                <from table="taptcuen">
                    <join type='inner' table="cbancpro">
                        <on>taptcuen.empcode = cbancpro.empcode</on>
                        <on>taptcuen.ctafin  = cbancpro.ctafin</on>
                        <join type='inner' table="crp_tes_qs_ctafin">
                            <on>cbancpro.empcode = crp_tes_qs_ctafin.empcode</on>
                            <on>cbancpro.ctafin  = crp_tes_qs_ctafin.ctafin</on>
                        </join>
                    </join>
                    <join table="${mTmpNumSemQS}">
                        <join type='left' table='crp_tes_qs_calenda' alias='crp_calenda'>
                            <on>crp_calenda.nummes = ${mTmpNumSemQS}.num_mes</on>
                            <on>crp_calenda.numsem = ${mTmpNumSemQS}.num_sem</on>
                        </join>
                    </join>
                </from>
                <where>
                    taptcuen.empcode          = ?
                    AND crp_calenda.ejerci =  ?
                    AND taptcuen.tipmov IN ('S','R')
                    AND taptcuen.concid IS NOT NULL
                    
                    
                    <!-- AND cbancpro.ctafin = 'BCPLCC9124'
                    AND crp_calenda.semana = 'S49' -->
                </where>
                <group>1,2,3,4,5,6,7</group>
            </select>
        `, fdata.empcode, fdata.ejerci);

    var rs_data_2 = Ax.db.executeQuery(`
        <select>
            <columns>
                tmp_ctafin.ctafin,
                tmp_ctafin.nomcta,

                tmp_ctafin.semana,

                (CASE WHEN textract.fecope &lt; tmp_ctafin.fecini THEN tmp_ctafin.impflu + NVL(textract.import, 0)
                     ELSE tmp_ctafin.impflu
                END)*(NVL(qs_cambios.cambio, 1)/${fdata.unidad}) impflu

            </columns>
            <from table="${mTmpCtaFin}" alias='tmp_ctafin'>
                <join type='left' table="textract">
                    <on>tmp_ctafin.ctafin = textract.ctafin</on>
                    <on>textract.docume LIKE 'SALDO INIC%'</on>
                </join>
                <join type='left' table="crp_tes_qs_calenda" alias='crp_calenda_2'>
                    <on>tmp_ctafin.semana = crp_calenda_2.semana</on>
                    <on>tmp_ctafin.fecini = crp_calenda_2.fecini</on>

                    <join type='left' table='crp_tes_qs_cambios' alias='qs_cambios'>
                        <on>crp_calenda_2.ejerci = qs_cambios.ejerci</on>
                        <on>crp_calenda_2.nummes = qs_cambios.period</on>
                        <on>crp_calenda_2.numsem = qs_cambios.numsem</on>
                    </join>
                </join>
            </from>
            <order>
                1, 2, tmp_ctafin.num_mes, tmp_ctafin.num_sem
            </order>
        </select>
    `).toMemory();

    let mRsPivot_2 = rs_data_2.pivot(options => {
        options.setPivotColumnNames(['semana']);
        options.setMeasureColumnNames(['impflu']);
    });

    // var mIntNumcols_2 = mRsPivot_2.getMetaData().getColumnCount() - 2;

    // // var mRsOutput_2 = new Ax.rs.Reader().memory(options => {
    // //     options.setColumnNames([
    // //         'codflu', 'nomflu'
    // //     ]);
    // //     options.setColumnTypes([
    // //         Ax.sql.Types.CHAR, Ax.sql.Types.CHAR
    // //     ]);
    // // });

    // // for (let i = 1; i <= mIntNumcols_2; i++) {
    // //     mRsOutput_2.cols().add(`sem_${i}`, Ax.sql.Types.DOUBLE);
    // // }

    for (let array of mRsPivot_2.toArray()) {
        mRsOutput.rows().add(array);
    }
// return mRsOutput
    /** CUENTAS BANC */


    // return mRsOutput
    // Update excel table label. (bal_datasql resultset)
    wb.update(mRsOutput, options => {
        options.setTableName("csaldos");
        options.setStartRow(wb.getNamedRow("csaldos") + 1);
        options.setEvaluate(true);
    });

    // Get information for header titles
    var rs_titulo = Ax.db.executeQuery(`
        <select>
            <columns>
                NVL(crp_calenda.ejerci, '${fdata.ejerci}') ejerci,
                (NVL(crp_calenda.nummes, ${mTmpNumSemQS}.num_mes)||NVL(crp_calenda.numsem, ${mTmpNumSemQS}.num_sem))::INTEGER codigo,
                NVL(crp_calenda.semana, '') semana
            </columns>
            <from table='${mTmpNumSemQS}' >
                <join type='left' table='crp_tes_qs_calenda' alias='crp_calenda'>
                    <on>crp_calenda.nummes = ${mTmpNumSemQS}.num_mes</on>
                    <on>crp_calenda.numsem = ${mTmpNumSemQS}.num_sem</on>
                </join>
            </from>
            <where>
                crp_calenda.ejerci = ?
            </where>
            <order>1, 2</order>
        </select>
    `, fdata.ejerci).toJSONArray();

    // Update excel label (rs_titulo current row tags)
    var i = 1;
    for(const campo of rs_titulo){

        const cell = wb.getCellByName(`csaldos.sem_${i}`);
        if (cell != null){
            cell.setCellValue(campo.semana);
        }
        i++;
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

var fdata = {
    empcode: '125',
    ejerci: 2024,
    moneda: 'PEN',
    unidad: 1
}
return crp_cashflow_qs_week('cashflow_qs_week_2024', fdata)