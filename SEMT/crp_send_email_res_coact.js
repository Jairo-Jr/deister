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
 *  Confidentiality and Non-disclosure' agreements explicitly covering such access.
 *  The notice above does not evidence any actual or intended publication
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
 * -----------------------------------------------------------------------------
 *
 *  JS:  crp_send_email_res_coact
 *  Version     : v1.1
 *  Date        : 26-07-2023
 *  Description : Envía por email información con la resolución coactiva al proveedor.
 *
 *  CALLED FROM:
 *  ==================
 *      Obj: crp_embargo_telematico_respuesta              A través de la acción 'ACTION_81'
 *
 *  PARAMETERS:
 *  ==================
 *                @param    {integer}   pIntIdFile      Identificador del fichero de respuesta de SUNAT
 *
 *                @param    {object}    pObjField       Objeto con informacion de field
 *                                                      String      codpar      Codigo de la partida de destino
 *                                                      String      codele      Codigo del elemento de destino
 *
 **/
function crp_send_email_res_coact(pObjData, pObjField) {

    /**
     * LOCAL FUNCTION: __addRowHtml
     *
     * Description: Función local que construye filas a la tabla que formara parte cuerpo del email.
     *
     * PARAMETERS:
     *      @param  {string}        pStrRowHtml       Row HTML
     *      @param  {Object}        pObjPagoOBS       Datos del efecto observado
     *      @param  {Object}        pObjData          Datos del formulario
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
     *      @param  {string}        pStrRowHtml             Row HTML
     *      @param  {string}        mStrTratoTercer         Forma de trato al tercer (ccontac.tratam)
     *      @param  {string}        mStrApellidoTercer      Apellido del tercer (ccontac.apelli)
     *      @param  {integer}       mIntImportPagar         Importe a pagar (emitido por SUNAT)
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
     * LOCAL FUNCTION: __sendEmail
     *
     * Description: Función local que envia email al proveedor (tercer)
     *
     * PARAMETERS:
     *      @param  {string}        pStrRowHtml             Row HTML
     *      @param  {string}        mStrTratoTercer         Forma de trato al tercer (ccontac.tratam)
     *      @param  {string}        mStrApellidoTercer      Apellido del tercer (ccontac.apelli)
     *      @param  {integer}       mIntImportPagar         Importe a pagar (emitido por SUNAT)
     */
    function __sendEmail(pStrEmailTercer, pObjField, pStrBodyHtml) {

        /**
         * Definicion de credenciales del usuario remitente
         */
        var mStrEmailUser       = 'cpefarmacia@crp.com.pe';
        var mStrEmailPassword   = 'CPEFARMACIA2021';

        var m_mail = new Ax.mail.MailerMessage();

        m_mail.from('no-reply@crp.com.pe');     // De
        m_mail.to(pStrEmailTercer);  // Para
        // m_mail.to('jairo.huallpa@deister.pe');  // Para

        if (pObjField.mailcc != null) {
            m_mail.cc(pObjField.mailcc);
        }
        if (pObjField.mailbcc != null) {
            m_mail.bcc(pObjField.mailbcc);
        }


        var mStrAsunto = pObjField.mailsubject;


        m_mail.subject(mStrAsunto);
        m_mail.setHtml(pStrBodyHtml);

        var m_mailer = new Ax.mail.Mailer();
        m_mailer.setSMTPServer("smtp.gmail.com", 587);
        m_mailer.setSMTPUsername(mStrEmailUser);
        m_mailer.setSMTPPassword(mStrEmailPassword);

        m_mailer.send(m_mail);
    }

    /**
     * mObjData {
     *      file_seqno      Identificador del archivo respuesta SUNAT
     *      ruc_tercer      RUC del proveedor (tercero)
     *      import_pagar    Importe a pagar (emitido por SUNAT en la RC)
     *      desc_estado     Estado del pago (emitido por SUNAT en la respuesta)
     *      res_coactiva    Resolucion Coactiva (emitido por SUNAT)
     *      codigo          Identificador de la linea
     *  }
     */
    var mObjData = Ax.util.js.object.assign({}, pObjData);

    /**
     * mObjField {
     *      mailsubject     Asunto del email
     *      mailcc          Copia del email
     *      mailbcc         Copia oculta del email
     *  }
     */
    var mObjField = Ax.util.js.object.assign({}, pObjField);

    var mStrRowHtml = '';
    var mStrBodyHtml = '';
    var mStrTratoTercer = '';
    var mStrApellidoTercer = '';
    var mStrEmailTercer = '';

    /**
     * Se valida la existencia de resolucion coactiva para enviar email
     */
    if (mObjData.res_coactiva == null || mObjData.import_pagar == null) {
        throw 'Debe existir Resolución coactiva e importe para enviar email.';
    }

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
                    ELSE 'jairo.huallpa@deister.pe'
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
    __sendEmail(mStrEmailTercer, mObjField, mStrBodyHtml);

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
    res_coactiva : 'RC654987321'
};
var pObjField = '';
crp_send_email_res_coact(pObjData, pObjField);



CASE WHEN ccontact.email1 IS NOT NULL THEN ccontact.email1
WHEN ccontact.email2 IS NOT NULL THEN ccontact.email2
ELSE 'jairo.huallpa@deister.pe'
END email