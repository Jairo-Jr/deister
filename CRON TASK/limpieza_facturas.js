function crp_send_email_res_coact(pObjData, pObjField) {

    /**
     * LOCAL FUNCTION: __addRowHtml
     *
     * Description: Función local que construye el HTML que se enviará por email
     *
     * PARAMETERS:
     *      @param  {string}        pStrHtmlTable       Tabla HTML
     *      @param  {Date}          pDateToday          Fecha actual
     *      @param  {string}        pStrTitle           Titulo del mensaje
     */
    function __addRowHtml(pStrRowHtml, pObjPagoOBS, pObjData) {
        var mStrRow = `
            <tr>
                <td class="col-left">${pObjPagoOBS.cif}</td>
                <td class="col-left">${pObjPagoOBS.nomcom}</td>
                <td class="col-left">${pObjPagoOBS.docser}</td>
                <td class="col-left">${pObjPagoOBS.fecven}</td>
                <td class="col-left">${pObjPagoOBS.fecha}</td>
                <td class="col-left">${pObjPagoOBS.det_import}</td>
                <td class="col-left">${pObjData.desc_estado}</td>
                <td class="col-left">${pObjData.res_coactiva}</td>
            </tr>
        `;

        return pStrRowHtml + mStrRow;
    }

    /**
     * LOCAL FUNCTION: __getBodyMensaje
     *
     * Description: Función local que construye el HTML que se enviará por email
     *
     * PARAMETERS:
     *      @param  {string}        pStrHtmlTable       Tabla HTML
     *      @param  {Date}          pDateToday          Fecha actual
     *      @param  {string}        pStrTitle           Titulo del mensaje
     */
    function __getBodyMensaje(pStrRowHtml, mStrTratoTercer, mStrApellidoTercer, mIntImportPagar) {

        return `
            <html lang="es">
                <head>
                    <style>
                        label {
                            font-size: 16px;
                        }

                        h1, h4{
                            font-size: 16px;
                            color: #00B2A9;
                            text-transform: uppercase;
                            font-weight: 300;
                            text-align: center;
                            padding-top: 13px;
                            font-weight:bold;
                        }

                        h4 {
                            font-size: 14px;

                        }

                        p  {
                            font-size: 16px;
                            font-color:#000;
                            margin-top: 0;
                        }

                        table{
                            width:100%;
                            table-layout: fixed;
                        }

                        .tbl-header{
                            background-color: rgba(255,255,255,0.3);
                            display: flex;
                        }
                        .tbl-content{
                            height:90%;
                            overflow-x:auto;
                            margin-top: 0px;
                            border: 1px solid rgba(255,255,255,0.3);
                        }
                        th{
                            padding: 20px 3px;
                            font-weight: 500;
                            font-size: 12px;
                            color: #4A4A49;
                            text-transform: uppercase;
                        }

                        th.title, td.title{
                            width: 20%;
                        }

                        th.borderhd, td.borderhd{
                            border-bottom: solid 1px #EFF0F1;
                            font-weight:bold;
                        }

                        td{
                            padding: 3px;
                            text-align: left;
                            vertical-align:middle;
                            font-weight: 300;
                            font-size: 12px;
                            color: #4A4A49;
                            word-wrap: break-word;
                            border-bottom: solid 1px #EFF0F1;
                            border-top: solid 1px #fff;
                        }

                        .tb-format{
                            padding: 0px 100px 0px 100px;
                        }

                        .center {
                            text-align:center;
                        }

                        .col-left, th .col-left{
                            text-align: left;
                        }

                        .col-right, th  .col-right{
                            text-align: right;
                        }
                    </style>
                </head>
                <body style="background-color: #fff; font-family: 'Roboto', sans-serif; padding: 10px;">
                    <label>Estimado(a) ${mStrTratoTercer} ${mStrApellidoTercer}, buenas tardes.</label>
                    <p>Hemos recibido la Resolución Coactiva de SUNAT por S/ ${mIntImportPagar} del siguiente pago. Por ello, por favor nos indica si se lo aplicamos en su pago o ustedes lo estarían regularizando.</p>
                    <div class="tbl-header">
                        <table cellspacing="0" border="0" class="tb-format">
                            <thead>
                                <tr>
                                    <th class="borderhd col-left">RUC Proveedor</th>
                                    <th class="borderhd col-left">Razón Social Proveedor</th>
                                    <th class="borderhd col-left">Documento</th>
                                    <th class="borderhd col-left">Fecha de vencimiento</th>
                                    <th class="borderhd col-left">Fecha de la Factura</th>
                                    <th class="borderhd col-left">Monto a Pagar</th>
                                    <th class="borderhd col-left">Estado del Registro</th>
                                    <th class="borderhd col-left">Nro. Res. Coactiva</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pStrRowHtml}
                            </tbody>
                        </table>
                    </div>
                </body>
            </html>`;
    }

    /**
     *
     */
    function __sendEmail(pObjData, pStrEmailTercer, pObjDetalleEmail, pStrBodyHtml) {

        /**
         * Definicion de credenciales del usuario remitente
         */
        var mStrEmailUser       = 'cpefarmacia@crp.com.pe';
        var mStrEmailPassword   = 'CPEFARMACIA2021';

        var m_mail = new Ax.mail.MailerMessage();

        m_mail.from('no-reply@crp.com.pe');     // De
        m_mail.to(pStrEmailTercer);  // Para

        var mStrAsunto = 'RESOLUCIÓN COACTIVA SUNAT POR S/ ' + pObjData.import_pagar + ' (' + pObjData.razon + ')';


        m_mail.subject(mStrAsunto);
        m_mail.setHtml(pStrBodyHtml);

        // if (pStrBcc !== null) {
        //     m_mail.bcc(pStrBcc);
        // }

        var m_mailer = new Ax.mail.Mailer();
        m_mailer.setSMTPServer("smtp.gmail.com", 587);
        m_mailer.setSMTPUsername(mStrEmailUser);
        m_mailer.setSMTPPassword(mStrEmailPassword);

        m_mailer.send(m_mail);
    }

    var mObjData = Ax.util.js.object.assign({}, pObjData);
    var mStrRowHtml = '';
    var mStrBodyHtml = '';
    var mStrTratoTercer = '';
    var mStrApellidoTercer = '';
    var mStrEmailTercer = '';

    /**
     * Se obtiene los efectos relacionados a la gestion de cartera
     * de observados por sunat
     */
    var mArrEfectosOBS = Ax.db.executeCachedQuery(`
        <select>
            <columns>
                cefectos.tercer,
                cefectos.fecven,
                cefectos.docser,
                CASE WHEN cefectos.clase = 'P' THEN +cefecges_det.det_import ELSE -cefecges_det.det_import END det_import,
                cefectos.fecha,

                CASE WHEN ctercero.nombre IS NOT NULL THEN ctercero.nombre
                    WHEN ctercero.nomcom IS NOT NULL THEN ctercero.nomcom
                    ELSE ''
                END nomcom,
                ctercero.cif,

                NVL(ccontact.tratam, '') tratam,
                NVL(ccontact.apelli, '') apelli,
                CASE WHEN ccontact.email1 IS NOT NULL THEN ccontact.email1
                    WHEN ccontact.email2 IS NOT NULL THEN ccontact.email2
                    ELSE ''
                END email
            </columns>
            <from table='cefecges_det'>
                <join table='cefectos'>
                    <on>cefecges_det.det_numero = cefectos.numero</on>
                </join>
                <join type='left' table='ctercero'>
                    <on>cefectos.tercer = ctercero.codigo</on>
                    <join type='left' table='ccontact'>
                        <on>ctercero.codigo = ccontact.tercer</on>
                    </join>
                </join>
            </from>
            <where>
                cefecges_det.pcs_seqno = (SELECT seqno_pobs FROM crp_embargo_telematico_respuesta WHERE file_seqno = ?)
            </where>
        </select>
    `,mObjData.file_seqno);
    // `,mObjData.file_seqno).toJSONArray();

    console.log(mArrEfectosOBS);

    /**
     * Recorrido de efectos observados por SUNAT
     */
    mArrEfectosOBS.forEach(mPagoOBS => {
        // console.log('Pago:', mPagoOBS);

        if(mPagoOBS.cif == mObjData.ruc_tercer) {

            console.log('Pago-Tercer:', mPagoOBS);

            mStrTratoTercer = mPagoOBS.tratam;
            mStrApellidoTercer = mPagoOBS.apelli;
            mStrEmailTercer = mPagoOBS.email;

            /**
             * Pago observado correspondiente al proveedor,
             * se agrega una fila a la tabla
             */
            mStrRowHtml = __addRowHtml(mStrRowHtml, mPagoOBS, mObjData);
        }
    });

    /**
     * Se construye el cuerpo del mensaje
     */
    mStrBodyHtml = __getBodyMensaje(mStrRowHtml, mStrTratoTercer, mStrApellidoTercer, mObjData.import_pagar);

    /**
     * Envio de email
     */
    __sendEmail(mObjData, mStrEmailTercer, '', mStrBodyHtml);

    /**
     * Se marca al detalle que fue enviado el email
     */
    Ax.db.execute(`
        UPDATE crp_registro_semt SET auxnum1 = 1 WHERE codigo = ${mObjData.codigo}
    `);

}

var pObjData = {
    file_seqno: 15,
    seqno_pobs: 177,
    ruc_tercer: '20514302473',
    import_pagar: 7380.00,
    razon: 'DIMEXA S.A.',
    desc_estado : 'Tiene deuda.',
    res_coactiva : 'RC654987321',
    codigo  : 124
};
var pObjField = '';
crp_send_email_res_coact(pObjData, pObjField);