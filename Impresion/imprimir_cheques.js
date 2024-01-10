
/**
 *
 * ORIGINAL
 * 04-10-2023
 * */


    var PAGE_WIDTH = 24.2;
    var PAGE_HEIGHT = 20.4;
    var bandas = 1.3, mArrlinesData = [], mObjCheck = {}, flag = true, mStrCodban = '',
    mStrMoneda = '', mStrBankAgent = '', mStrTipDoc = '';

    // ====================================================================
    // FUNCTION TO CONVERT NUMBERS IN ITS EQUIVALENT ON LETTERS
    // ====================================================================
    function __numerosaLetras(cantidad) {

    function __unidades(unidad) {
        var unidades = Array('UN ', 'DOS ', 'TRES ', 'CUATRO ', 'CINCO ', 'SEIS ', 'SIETE ', 'OCHO ', 'NUEVE ');


        return unidades[unidad - 1];
    }

    function __decenas(decena, unidad) {
    var diez = Array('ONCE ', 'DOCE ', 'TRECE ', 'CATORCE ', 'QUINCE', 'DIECISEIS ', 'DIECISIETE ', 'DIECIOCHO ', 'DIECINUEVE ');
    var decenas = Array('DIEZ ', 'VEINTE ', 'TREINTA ', 'CUARENTA ', 'CINCUENTA ', 'SESENTA ', 'SETENTA ', 'OCHENTA ', 'NOVENTA ');

    if (decena == 0 && unidad == 0) {
    return "";
}

    if (decena == 0 && unidad > 0) {
    return __unidades(unidad);
}

    if (decena == 1) {
    if (unidad == 0) {
    return decenas[decena - 1];
} else {
    return diez[unidad - 1];
}
} else {

    if (unidad == 0) {
    return decenas[decena - 1] + " ";
}
    if (unidad == 1) {
    return decenas[decena - 1] + " Y " + "UNO";
}

    return decenas[decena - 1] + " Y " + __unidades(unidad);
}
}

    function __centenas(centena, decena, unidad) {
    var centenas = Array("CIENTO ", "DOSCIENTOS ", "TRESCIENTOS ", "CUATROCIENTOS ", "QUINIENTOS ", "SEISCIENTOS ", "SETECIENTOS ", "OCHOCIENTOS ", "NOVECIENTOS ");

    if (centena == 0 && decena == 0 && unidad == 0) {
    return "";
}
    if (centena == 1 && decena == 0 && unidad == 0) {
    return "CIEN ";
}

    if (centena == 0 && decena == 0 && unidad > 0) {
    return __unidades(unidad);
}

    if (decena == 0 && unidad == 0) {
    return centenas[centena - 1] + "";
}

    if (decena == 0) {
    var numero = centenas[centena - 1] + "" + __decenas(decena, unidad);
    return numero.replace(" Y ", " ");
}
    if (centena == 0) {

    return __decenas(decena, unidad);
}

    return centenas[centena - 1] + "" + __decenas(decena, unidad);

}

    function __unidadesdemillar(unimill, centena, decena, unidad) {
    var numero = __unidades(unimill) + " MIL " + __centenas(centena, decena, unidad);
    numero = numero.replace("UN  MIL ", "MIL ");
    if (unidad == 0) {
    return numero.replace(" Y ", " ");
} else {
    return numero;
}
}

    function __decenasdemillar(decemill, unimill, centena, decena, unidad) {
    var numero = __decenas(decemill, unimill) + " MIL " + __centenas(centena, decena, unidad);
    return numero;
}

    function __centenasdemillar(centenamill, decemill, unimill, centena, decena, unidad) {

    var numero = 0;
    numero = __centenas(centenamill, decemill, unimill) + " MIL " + __centenas(centena, decena, unidad);

    return numero;
}

    function __separar_split(texto) {
    var contenido = new Array();
    for (var i = 0; i < texto.length; i++) {
    contenido[i] = texto.substr(i, 1);
}
    return contenido;
}

    var numero = 0;
    cantidad = parseFloat(cantidad);

    if (cantidad == "0.00" || cantidad == "0") {
    return "CERO con 00/100 ";
} else {
    var ent = cantidad.toString().split(".");
    var arreglo = __separar_split(ent[0]);
    var longitud = arreglo.length;

    switch (longitud) {
    case 1:
    numero = __unidades(arreglo[0]);
    break;
    case 2:
    numero = __decenas(arreglo[0], arreglo[1]);
    break;
    case 3:
    numero = __centenas(arreglo[0], arreglo[1], arreglo[2]);
    break;
    case 4:
    numero = __unidadesdemillar(arreglo[0], arreglo[1], arreglo[2], arreglo[3]);
    break;
    case 5:
    numero = __decenasdemillar(arreglo[0], arreglo[1], arreglo[2], arreglo[3], arreglo[4]);
    break;
    case 6:
    numero = __centenasdemillar(arreglo[0], arreglo[1], arreglo[2], arreglo[3], arreglo[4], arreglo[5]);
    break;
}

    ent[1] = isNaN(ent[1]) ? '00' : ent[1];

    return numero + " Y " + ent[1] + "/100";
}
}

    // ====================================================================
    // CREATE DOCUMENT FOR CHECKS
    // ====================================================================

    var root = new Ax.fop.DocumentBuilder().createDocument(PAGE_WIDTH, PAGE_HEIGHT, 0, 0, 0, 0)
    // root.setDebug("*")
    root.getSimplePageMaster().setMargins(bandas, bandas, 0, 0)

    root.getSimplePageMaster().getRegionBefore().setExtent(0);
    root.getSimplePageMaster().getRegionAfter().setExtent(1);
    root.getSimplePageMaster().getRegionStart().setExtent(0);
    root.getSimplePageMaster().getRegionEnd().setExtent(0);

    // ====================================================================
    // FUNCTION TO FILL ONE ROW OF LINESTABLE
    // ====================================================================

    const __completeLineas = (genTable, data) => {

    var genRow = genTable.getBody().addRow()

    genRow.addCell().addBlock(data.cuenta || '').setMarginLeft(0.5)
    genRow.addCell().addBlock(data.subcta || '').setTextAlign('center')
    genRow.addCell().addBlock(data.proved || '').setFontSize(7).setMarginLeft('-5pt')
    genRow.addCell().addBlock(data.tipdoc || '')
    genRow.addCell().addBlock(data.numero || '')
    genRow.addCell().addBlock(data.fecemi || '')
    genRow.addCell().addBlock(data.fecven || '')
    genRow.addCell().addBlock(data.debito || '').setTextAlign('end')
    genRow.addCell().addBlock(data.credit || '').setTextAlign('end')

}

    // ====================================================================
    // FETCH DATA
    // ====================================================================

    var mRsMain = Ax.db.executeQuery(`<select>
    <columns>
        cremesas.fecrem, cremesas.imptot, cefectos.codper, ctercero.nombre,
        cbancpro.codban, cremesas.coment, cefectos.cuenta, cefectos.docser,
        cefectos.fecha, cefectos.fecven, cefectos.impdiv, cbancpro.moneda,
        cefectos.jusser,
        CASE WHEN cefecges_pcs.pcs_impdiv &lt; 0 THEN -cefecges_pcs.pcs_impdiv ELSE cefecges_pcs.pcs_impdiv END pcs_impdiv,
        CASE WHEN cefectos.impdiv &lt; 0 THEN -cefectos.impdiv ELSE 0 END debit,
        CASE WHEN cefectos.impdiv &gt; 0 THEN cefectos.impdiv ELSE 0 END credit
    </columns>
    <from table='cremesas'>
        <join table='cbancpro'>
            <on>cremesas.ctafin = cbancpro.ctafin</on>
        </join>
        <join table='cefecges_pcs'>
            <on>cefecges_pcs.pcs_numrem = cremesas.numrem</on>
            <join table="cefecges_det">
                <on>cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno</on>
                <join table="cefectos">
                    <on>cefecges_det.det_numero = cefectos.numero</on>
                    <join type='left' table='ctercero' >
                        <on>cefectos.codper = ctercero.codigo</on>
                    </join>
                    <join type='left' table='cterbanc'>
                        <on>cefectos.codper = cterbanc.codigo</on>
                        <on>cefectos.numban = cterbanc.numban</on>
                    </join>
                </join>
            </join>
        </join>
    </from>
    <where>
        cremesas.tipdoc IN ('PCHET', 'CCHET')
        AND cremesas.numrem = ?
    </where>
</select>`, Ax.context.data.numrem)


    mRsMain.cursor().forEach(row => {

    let mStrFecemi = new Date(row.fecha)
    mStrFecemi = `${mStrFecemi.getDate() < 10 ? '0' + mStrFecemi.getDate() : mStrFecemi.getDate()}/${mStrFecemi.getMonth() < 10 ? '0' + mStrFecemi.getMonth() : mStrFecemi.getMonth()}/${String(mStrFecemi.getFullYear()).slice(2)}`
    let mStrFecven = new Date(row.fecven)
    mStrFecven = `${mStrFecven.getDate() < 10 ? '0' + mStrFecven.getDate() : mStrFecven.getDate()}/${mStrFecven.getMonth() < 10 ? '0' + mStrFecven.getMonth() : mStrFecven.getMonth()}/${String(mStrFecven.getFullYear()).slice(2)}`
    let mStrFecha = new Date(row.fecha)
    mStrFecha = `${mStrFecha.getDate() < 10 ? '0' + mStrFecha.getDate() : mStrFecha.getDate()}/${mStrFecha.getMonth() < 10 ? '0' + mStrFecha.getMonth() : mStrFecha.getMonth()}/${String(mStrFecha.getFullYear())}`


    if (flag) {
    mObjCheck.nombre = row.nombre
    mObjCheck.imptot = row.pcs_impdiv
    mObjCheck.coment = row.coment
    mObjCheck.fecha = mStrFecha
    mStrCodban = row.codban
    mStrMoneda = row.moneda

    let mStrGvenTipDoc = Ax.db.executeGet(`SELECT dockey FROM gvenfach WHERE docser = ?`, row.docser)
    let mStrCvenTipDoc = Ax.db.executeGet(`SELECT dockey FROM cvenfach WHERE docser = ?`, row.docser)
    let mStrGcomTipDoc = Ax.db.executeGet(`SELECT dockey FROM gcomfach WHERE refter = ? AND tercer = ?`, row.docser, row.codper)
    let mStrCcomTipDoc = Ax.db.executeGet(`SELECT dockey FROM ccomfach WHERE docser = ?`, row.jusser)

    mStrTipDoc = mStrGvenTipDoc || mStrCvenTipDoc || mStrGcomTipDoc || mStrCcomTipDoc || ''

    flag = false;
}

    mTempObj = {
    'cuenta': row.cuenta.slice(0, 7),
    'subcta': '',
    'proved': row.codper,
    'tipdoc': mStrTipDoc,
    'numero': row.docser,
    'fecemi': mStrFecemi,
    'fecven': mStrFecven,
    'debito': row.debit,
    'credit': row.credit
}

    mArrlinesData.push(mTempObj)
})

    // ====================================================================
    // SET MARGIN MEASURES FOR EACH BANK
    // ====================================================================

    console.log(mStrMoneda)

    var mObjGenericMeasures = {}

    switch (mStrCodban) {
    case 'PE0002': {
    if (mStrMoneda == 'PEN') {
    mStrBankAgent = 'BANCO CREDIT'
    mObjGenericMeasures = {
    "checkTableMargin": 1,
    "dateSize": 0.9,
    "amountSize": 3.5,
    "amountMarginL": 1.2,
    "amountMarginT": 0,
    "tercerMarginL": 2.9,
    "tercerMarginT": 1,
    "qtyDesMarginL": 0.3,
    "qtyDesMarginT": 0.5,
    "descMarginTop": 5,
    "linesMarginTop": 1.5,
    "lineDateSize": 2,
    "lineDebCredSize": 2.45,
    "totalMarginTop": -1.15,
    "totalMarginLeft": 11.3
}
} else {
    mStrBankAgent = 'BCO.CRED. $'
    mObjGenericMeasures = {
    "checkTableMargin": 0.9,
    "dateSize": 1,
    "amountSize": 4.2,
    "amountMarginL": 0.5,
    "amountMarginT": 0,
    "tercerMarginL": 2.9,
    "tercerMarginT": 0.9,
    "qtyDesMarginL": 0.3,
    "qtyDesMarginT": 0.5,
    "descMarginTop": 5,
    "linesMarginTop": 1.5,
    "lineDateSize": 2,
    "lineDebCredSize": 2.45,
    "totalMarginTop": -1.15,
    "totalMarginLeft": 11.3
}
}
    break;
};
    case 'PE0011': {
    if (mStrMoneda == 'PEN') {
    mStrBankAgent = 'CONTINENT'
    mObjGenericMeasures = {
    "checkTableMargin": 1,
    "dateSize": 1,
    "amountSize": 4,
    "amountMarginL": 0.7,
    "amountMarginT": 0.1,
    "tercerMarginL": 2.4,
    "tercerMarginT": 1.1,
    "qtyDesMarginL": 0.2,
    "qtyDesMarginT": 0.4,
    "descMarginTop": 5,
    "linesMarginTop": 1.7,
    "lineDateSize": 2.2,
    "lineDebCredSize": 2,
    "totalMarginTop": -1.13,
    "totalMarginLeft": 11.7
}
} else {
    mStrBankAgent = 'BCO. CONT. $'
    mObjGenericMeasures = {
    "checkTableMargin": 1,
    "dateSize": 1,
    "amountSize": 4,
    "amountMarginL": 0.5,
    "amountMarginT": 0,
    "tercerMarginL": 2.2,
    "tercerMarginT": 1.1,
    "qtyDesMarginL": 0.5,
    "qtyDesMarginT": 0.4,
    "descMarginTop": 5.1,
    "linesMarginTop": 1.4,
    "lineDateSize": 2.2,
    "lineDebCredSize": 2,
    "totalMarginTop": -1.18,
    "totalMarginLeft": 11.7
}
}
    break;
};
    case 'PE0009': {
    mStrBankAgent = 'SCOTIABANK'
    mObjGenericMeasures = {
    "checkTableMargin": 1,
    "dateSize": 1,
    "amountSize": 4,
    "amountMarginL": 1.1,
    "amountMarginT": 0,
    "tercerMarginL": 1.8,
    "tercerMarginT": 1.1,
    "qtyDesMarginL": 1.8,
    "qtyDesMarginT": 0.4,
    "descMarginTop": 5.1,
    "linesMarginTop": 1.7,
    "lineDateSize": 2.2,
    "lineDebCredSize": 2,
    "totalMarginTop": -1.16,
    "totalMarginLeft": 11.7
}
    break;
};
    case 'PE0003': {
    mStrBankAgent = 'INTERBANK'
    mObjGenericMeasures = {
    "checkTableMargin": 0.9,
    "dateSize": 0.9,
    "amountSize": 5,
    "amountMarginL": 1.8,
    "amountMarginT": 0.1,
    "tercerMarginL": 1.7,
    "tercerMarginT": 1.1,
    "qtyDesMarginL": 0.3,
    "qtyDesMarginT": 0.5,
    "descMarginTop": 4.8,
    "linesMarginTop": 1.5,
    "lineDateSize": 2,
    "lineDebCredSize": 2.45,
    "totalMarginTop": -1.16,
    "totalMarginLeft": 11.3
}
    break;
}
}

    // ====================================================================
    // SET BODY CONTENT
    // ====================================================================

    var flow = root.getBodyFlow();

    var checkTable = flow.addTable()
    checkTable.setFontFamily('monospace').setFontSize(9)

    checkTable.setMarginTop(mObjGenericMeasures.checkTableMargin)

    checkTable.addColumn().setColumnWidth(5.45);
    checkTable.addColumn().setColumnWidth(1.35);
    checkTable.addColumn().setColumnWidth(mObjGenericMeasures.dateSize);
    checkTable.addColumn().setColumnWidth(mObjGenericMeasures.dateSize);
    checkTable.addColumn().setColumnWidth(mObjGenericMeasures.dateSize);
    checkTable.addColumn().setColumnWidth(mObjGenericMeasures.amountSize);
    checkTable.addColumn();

    var rowC1 = checkTable.getBody().addRow()

    rowC1.addCell()
    rowC1.addCell().addBlock('').setTextAlign('center').setFontSize(8)
    rowC1.addCell().addBlock(mObjCheck.fecha.slice(0, 2)).setTextAlign('center').setFontSize(8)
    rowC1.addCell().addBlock(mObjCheck.fecha.slice(3, 5)).setTextAlign('center').setFontSize(8)
    rowC1.addCell().addBlock(mObjCheck.fecha.slice(6)).setTextAlign('center').setFontSize(8)

    let imptotComplCount = 17 - String(mObjCheck.imptot).length
    rowC1.addCell().addBlock('*'.repeat(imptotComplCount) + String(mObjCheck.imptot)).setTextAlign('center').setFontWeight('700')
    .setMarginLeft(mObjGenericMeasures.amountMarginL)
    .setMarginTop(mObjGenericMeasures.amountMarginT)

    var rowC1 = checkTable.getBody().addRow()
    imptotComplCount = 59 - mObjCheck.nombre.length
    rowC1.addCell().setColspan(7).addBlock(mObjCheck.nombre + '*'.repeat(imptotComplCount))
    .setFontWeight('700').setMarginLeft(mObjGenericMeasures.tercerMarginL).setMarginTop(mObjGenericMeasures.tercerMarginT)

    var rowC3 = checkTable.getBody().addRow()
    let mStrTotLetas = __numerosaLetras(mObjCheck.imptot)
    imptotComplCount = 59 - mStrTotLetas.length

    rowC3.addCell().setColspan(7).addBlock(mStrTotLetas + '*'.repeat(imptotComplCount))
    .setFontWeight('700').setMarginLeft(mObjGenericMeasures.qtyDesMarginL).setMarginTop(mObjGenericMeasures.qtyDesMarginT)

    var descTable = flow.addTable()
    descTable.setFontFamily('monospace').setFontSize(9)

    descTable.setMarginTop(mObjGenericMeasures.descMarginTop)

    descTable.addColumn().setColumnWidth(11.3);
    descTable.addColumn().setColumnWidth(10.2);


    var rowD1 = descTable.getBody().addRow()
    var rowD2 = descTable.getBody().addRow()
    var rowD3 = descTable.getBody().addRow()
    var rowD4 = descTable.getBody().addRow()

    rowD1.addCell().addBlock(mObjCheck.fecha).setMarginLeft(2.3)
    rowD2.addCell().addBlock(mObjCheck.nombre || '').setMarginLeft(2.3)
    rowD3.addCell().setRowspan(2).addBlock(mObjCheck.coment || '').setMarginLeft(2.3)
    rowD3.addCell().addBlock('22604').setMarginLeft(2.2)
    rowD4.addCell().addBlock(mStrBankAgent).setMarginLeft(2.2)


    var linesTable = flow.addTable()
    linesTable.setFontFamily('monospace').setFontSize(8)

    linesTable.setMarginTop(mObjGenericMeasures.linesMarginTop)

    linesTable.addColumn().setColumnWidth(1.8);
    linesTable.addColumn().setColumnWidth(0.8);
    linesTable.addColumn().setColumnWidth(1.3);
    linesTable.addColumn().setColumnWidth(0.6);
    linesTable.addColumn().setColumnWidth(2.8);
    linesTable.addColumn().setColumnWidth(mObjGenericMeasures.lineDateSize);
    linesTable.addColumn().setColumnWidth(mObjGenericMeasures.lineDateSize);
    linesTable.addColumn().setColumnWidth(mObjGenericMeasures.lineDebCredSize);
    linesTable.addColumn().setColumnWidth(mObjGenericMeasures.lineDebCredSize);

    var mFloatDebAcum = 0.0, mFloatCredAcum = 0.0

    mArrlinesData.forEach(row => {
    __completeLineas(linesTable, row)
    mFloatDebAcum += row.debito
    mFloatCredAcum += row.credit
})


    // ====================================================================
    // SET AFTER FOR TOTAL AMOUNTS
    // ====================================================================

    var after = root.getStaticContentAfter()

    var totalTable = after.addTable()

    totalTable.setMarginTop(mObjGenericMeasures.totalMarginTop).setFontFamily('monospace').setFontSize(8)

    totalTable.addColumn().setColumnWidth(mObjGenericMeasures.totalMarginLeft);
    totalTable.addColumn().setColumnWidth(mObjGenericMeasures.lineDebCredSize);
    totalTable.addColumn().setColumnWidth(mObjGenericMeasures.lineDebCredSize);

    var row = totalTable.getBody().addRow()

    row.addCell()
    row.addCell().addBlock(mFloatDebAcum.toFixed(2)).setTextAlign('end')
    row.addCell().addBlock(mFloatCredAcum.toFixed(2)).setTextAlign('end')


    // ====================================================================
    // GENERATE PDF
    // ====================================================================

    var fop = root.toFOP();
    let pdf = new Ax.fop.Processor().transform(fop);

    return pdf

