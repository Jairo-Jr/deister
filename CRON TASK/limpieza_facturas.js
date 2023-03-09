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
 *  JS:  pe_task_clean_msg_xml 
 * 
 *  Version     : 1.0
 *  Date        : 08-03-2023
 *  Description : Funcion encargada de realizar limpieza a mensajes referente a facturas. 
 * 
 *  CALLED FROM:
 *  ==================
 *      CRON-TASK:   pe_task_clean_msg_xml 
 * 
 *  PARAMETERS:
 *  ==================
 *          @param  {string}        pStrTypeEmail     Tipo de email (Logística 'L' - Farmacia 'F') 
 * 
 **/
function pe_task_clean_msg_xml(pStrTypeEmail) { 

    /**
     * LOCAL FUNCTION: __build_html_row
     * 
     * Description: Función local que construye las filas para la tabla
     * 
     * PARAMETERS:
     *      @param  {integer}       pIntNumFacturas     Número total de registros asociado a un grupo de error
     *      @param  {string}        pStrMsgError        Mensaje de error
     *      @param  {integer}       pIntMsgId           Identificador del mensaje de error
     *      @param  {integer}       pIntMsgRuc          Numero de RUC
     *      @param  {string}        pStrNomComercial    Nombre comercial asociado al RUC
     *      @param  {string}        pHtmlRow            Cadena con el conjunto de filas
     *      @param  {integer}       pIntRowNum          Número de registro
     */ 
    function __build_html_row(pStrColumn1, pStrColumn2, pStrColumn3, pHtmlRow){

        // ===============================================================
        // Se concatena la fila con los valores determinados
        // ===============================================================
        return pHtmlRow +  `<tr><td class="col-left">${pStrColumn1}</td><td class="col-left">${pStrColumn2}</td><td class="col-left">${pStrColumn3}</td></tr>`;
        
    }

    /**
     * LOCAL FUNCTION: __build_html_table
     * 
     * Description: Función local que construye la tabla con el conjunto de filas
     * 
     * PARAMETERS:
     *      @param  {string}        pHtmlRows           Cadena con el conjunto de filas
     *      @param  {integer}       pIntNumTotal        Cantidad total de registros
     */
    function __build_html_table(mObjNameColmuns , pHtmlRows, pIntNumTotal){

        return `<div class="tbl-header">
                    <table cellspacing="0" border="0" class="tb-format">
                        <thead>
                            <tr>
                                <th class="borderhd col-left">${mObjNameColmuns.nameColumn1}</th>
                                <th class="borderhd col-left">${mObjNameColmuns.nameColumn2}</th> 
                                <th class="borderhd col-left">${mObjNameColmuns.nameColumn3}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pHtmlRows}
                            <tr>
                                <td class="col-left" style="font-weight:bold;">TOTAL</td>
                                <td></td> 
                                <td class="col-right" style="font-weight:bold;">${pIntNumTotal}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>`;
    }
    
    /**
     * LOCAL FUNCTION: __build_html
     * 
     * Description: Función local que construye el HTML que se enviará por email
     * 
     * PARAMETERS:
     *      @param  {string}        pHtmlTable          Tabla HTML
     *      @param  {Date}          pDateToday          Fecha actual
     *      @param  {string}        pStrTitle           Titulo del mensaje
     */
    function __build_html(pHtmlTable, pDateToday, pStrTitle){
      
        return `
            <html>
                <head>
                    <style>             
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
                            font-size: 13px;
                            font-color:#000;
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
                    <div>
                        <h1>${pStrTitle}</h1>
                        <h4 class="center">Fecha: ${pDateToday}</h4>
                    </div>                
                    <div>
                        ${pHtmlTable}
                    </div>
                </body>
            </html>`;
    }

    /**
     * LOCAL FUNCTION: __send_mail
     * 
     * Description: Función local que envia el email
     * 
     * PARAMETERS:
     *      @param  {string}        pStrFrom            Email de origen
     *      @param  {string}        pStrTo              Lista de email de destino
     *      @param  {string}        pStrBcc             Lista de email Cc
     *      @param  {string}        pStrSubject         Asunto del email
     *      @param  {string}        pHtmlCode           Cuerpo HTML del email
     */
    function __send_mail(pStrFrom, pStrTo, pStrBcc, pStrSubject, pHtmlCode) {

        var m_mail = new Ax.mail.MailerMessage();

        m_mail.from(pStrFrom);
        m_mail.to(pStrTo);

        if (pStrBcc !== null) {
            m_mail.bcc(pStrBcc);
        }

        m_mail.subject(pStrSubject);
        m_mail.setHtml(pHtmlCode); 

        var m_mailer = new Ax.mail.Mailer();
        m_mailer.setSMTPServer("smtp.gmail.com", 587);
        m_mailer.setSMTPUsername(mStrEmailUser);
        m_mailer.setSMTPPassword(mStrEmailPassword);
        m_mailer.send(m_mail);
    } 

    /**
     * LOCAL FUNCTION: __send_mail
     * 
     * Description: Función local que construye el contenido del mensaje 
     *              y enviarlo por email.
     * 
     * PARAMETERS:
     *      @param  {object}        pObjErrors         Objeto que contiene el conjunto de errores
     *      @param  {integer}       pIntErrorType      Número que identifica el tipo de error ('0' Funcionales y '1' Tecnicos )
     */
    function __build_and_send_email(pObjErrors, pIntErrorType) { 

        // ===============================================================
        // Definición de variables
        // ===============================================================
        var mStrTitle          = pObjErrors.title;
        var mArrayErrores      = pObjErrors.errors; 
        var mIntEmailGroup     = pIntErrorType; 
        var mHtmlRow           = ''; 
        var mIntNumberInvoices = 0;
        var mIntTotalRegisters = 0;
        var mStrEmailSubject;
        

        mArrayErrores.forEach(mError => { 

            // ===============================================================
            // Captura de la sentencia de error.
            // ===============================================================
            var mStrError = (mIntEmailGroup == 0) ? mError.error : mError;

            // ===============================================================
            // Filtrado de facturas según la sentencia de error.
            // ===============================================================
            var mRsIncorrectInvoices = Ax.db.executeQuery(`
                <select>
                    <columns>
                        pe_msg_xml_proveed.msg_id, 
                        pe_msg_xml_proveed.msg_ruc, 
                        pe_msg_xml_proveed.msg_type, 
                        pe_msg_xml_proveed.msg_error,
                        ctercero.nomcom
                    </columns>
                    <from table='pe_msg_xml_proveed'>
                        <join table='ctercero'>
                            <on>pe_msg_xml_proveed.msg_ruc = ctercero.cif</on>
                        </join>
                    </from>
                    <where>
                        msg_status = 'E'
                        AND msg_error LIKE '${mStrError}'
                    </where>
                    <order>1</order>
                </select>
            `).toJSONArray();

            mIntNumberInvoices = mRsIncorrectInvoices.length;
            mIntTotalRegisters += mIntNumberInvoices; 
            
            // ===============================================================
            // Si el tipo de error es Funcional
            // ===============================================================
            if (mIntEmailGroup == 0) { 
                // ===============================================================
                // Recorrido de las facturas con error.
                // ===============================================================
                mRsIncorrectInvoices.forEach(mObjIncorrectInvoice => { 

                    // ===============================================================
                    // Construccion de filas
                    // ===============================================================
                    mHtmlRow = __build_html_row(mObjIncorrectInvoice.msg_id, mObjIncorrectInvoice.msg_ruc, mObjIncorrectInvoice.nomcom, mHtmlRow); 

                });
            } else { 
                
                mHtmlRow = __build_and_group(mRsIncorrectInvoices, mHtmlRow);
            }
            
            

        });

        // ===============================================================
        // Se define el nombre de las columnas segun el tipo de error
        // =============================================================== 
        var mObjNameColmuns = {
            nameColumn1: (mIntEmailGroup == 0) ? 'ID Mensaje'   : 'Tipo de documento',
            nameColumn2: (mIntEmailGroup == 0) ? 'RUC'          : 'Mensaje de error',
            nameColumn3: (mIntEmailGroup == 0) ? 'Razón social' : 'Cantidad de errores'
        };
        // ===============================================================
        // Si existe registros a ser informados, se realiza 
        // el envío de email.
        // =============================================================== 
        if (mIntTotalRegisters > 0) { 

            var mHtmlTable = __build_html_table(mObjNameColmuns, mHtmlRow, mIntTotalRegisters);
            var mHtmlBody  = __build_html(mHtmlTable, mStrDate, mStrTitle); 

            // ===============================================================
            // Segun el grupo de errores se designa la lista 
            // de emails como destinatarios:
            //  * Tipo '0': Los emails de destino son CRP y con copia a Deister
            //  * Tipo '1': Los emails de destino son solo a Deister
            // ===============================================================
            mStrEmailTo    = (mIntEmailGroup == 0) ? mStrEmailTo : mStrEmailBcc; 
            mStrEmailSubject = (mIntEmailGroup == 0) ? mStrEmailSubjectFunc : mStrEmailSubjectTec; 
            __send_mail(mStrEmailFrom, mStrEmailTo, mStrEmailBcc, mStrEmailSubject, mHtmlBody);
        }
    }

    /**
     * LOCAL FUNCTION: __build_and_group
     * 
     * Description: Función local que construye y agrupa filas de la tabla 
     *              segun el mensaje de error y el tipo de mensaje, exclusivo 
     *              para aquellos de errores tecnicos.
     * 
     * PARAMETERS:
     *      @param  {ResultSet}         pRsIncorrectInvoices            ResultSet con inconsistencias segun un grupo de error
     *      @param  {String}            pHtmlRow                        Concatenado de filas <tr></tr>
     */
    function __build_and_group(pRsIncorrectInvoices, pHtmlRow) { 
        
        if (pRsIncorrectInvoices.length > 0) {
            
            // ===============================================================
            // Definición de variables
            // ===============================================================
            var mIntNumberRegisters = 1;
            var mTypeMsgInit = pRsIncorrectInvoices[0].msg_type;     // Captura del primer tipo de mensaje
            var mStringMessage; 
            var mHtmlTmp = ''; 

            // ===============================================================
            // Recorrido de inconsistencias
            // ===============================================================
            pRsIncorrectInvoices.forEach(item => {
                
                mStringMessage = item.msg_error;

                // ===============================================================
                // Si el tipo de mensaje es diferente al inicial, 
                // se concatena una fila de la tabla y se inicializa variables:
                //  * Cantidad de registros () a 1
                //  * Tipo de mensaje inicial (mTypeMsgInit) al de la siguiente iteracion
                // ===============================================================
                if (mTypeMsgInit != item.msg_type) {
                    pHtmlRow = pHtmlRow + mHtmlTmp;
                    mIntNumberRegisters = 1;
                    mTypeMsgInit = item.msg_type;
                    mHtmlTmp = `<tr><td class="col-left">${mTypeMsgInit}</td><td class="col-left">${mStringMessage}</td><td class="col-left">${mIntNumberRegisters}</td></tr>`; 
                    
                } else {

                    // ===============================================================
                    // Si el tipo de mensaje es igual al inicial, se captura 
                    // una fila temporal y se incrementa en uno 
                    // el número de registros.
                    // ===============================================================
                    mHtmlTmp = `<tr><td class="col-left">${mTypeMsgInit}</td><td class="col-left">${mStringMessage}</td><td class="col-left">${mIntNumberRegisters}</td></tr>`;
                    mIntNumberRegisters++
                    
                } 
            }); 
            pHtmlRow = pHtmlRow + mHtmlTmp;
        }
        
        return pHtmlRow;
    }

    // ===============================================================
    // Definición de variables
    // ===============================================================
    var mStrEmailFrom        = 'no-reply@crp.com.pe';
    var mStrEmailUser        = '';
    var mStrEmailPassword    = '';
    var mStrEmailTo          = '';
    var mStrEmailBcc         = '';
    var mDateToday           = new Ax.util.Date();
    var mDateMonth           = mDateToday.getMonth() +1;
    var mStrDate             = mDateToday.getDate() + '/' + mDateMonth + '/' + mDateToday.getFullYear(); 
    var mStrDBName           = Ax.db.getPhysicalCode();
    var mStrEmailSubjectFunc = `[DB: ${mStrDBName}] Reporte de incosistencias XML de proveedores`; 
    var mStrEmailSubjectTec  = `[DB: ${mStrDBName}] Reporte de incosistencias técnicas de XML de proveedores`; 

    switch(mStrDBName){
        
        case 'ghq_crp_qa'  :
            mStrEmailTo          = 'mcerna@crp.com.pe, dcachuan@crp.com.pe';
            mStrEmailBcc         = 'evelyn.galarza@deister.pe, omar.concepcion@deister.pe, mrocha@deister.pe, jairo.huallpa@deister.pe, jose.leon@deister.pe';
            break;
            
        case 'ghq_crp_pro'  :
            mStrEmailTo          = 'mcerna@crp.com.pe, dcachuan@crp.com.pe';
            mStrEmailBcc         = 'evelyn.galarza@deister.pe, omar.concepcion@deister.pe, mrocha@deister.pe, jairo.huallpa@deister.pe, jose.leon@deister.pe';
            mStrEmailSubjectFunc = `Reporte de incosistencias XML de proveedores`; 
            break;
            
        default :
            mStrEmailTo          = 'evelyn.galarza@deister.pe, omar.concepcion@deister.pe, mrocha@deister.pe, jairo.huallpa@deister.pe, jose.leon@deister.pe';
            mStrEmailBcc         = 'mrocha@deister.pe, cbordes@deister.es, marlon.fernandez@deister.pe, cesar.guevara@deister.pe, cristel.castaneda@deister.pe, cesar.castillo@deister.pe';
    } 

    // ===============================================================
    // Objeto con información sobre errores funcionales.
    // ===============================================================
    var mObjErrorFunctional = {
        title: 'Inconsistencia de lectura de factura XML: Periodo cerrado',
        errors: [
            {
                error: '%periodo%Cerrado%',
                msgCustom: 'Periodo Cerrado'
            }
        ]
    };

    // ===============================================================
    // Objeto con información sobre errores técnicos
    // ===============================================================
    var mObjErrorTechnical = {
        title: 'Errores técnicos: Inconsistencia de lectura de factura XML',
        errors: ['%conversion%failed%', '%Invalid%in%', '%Content%allowed%']
    } 

    // ===============================================================
    // Obtencion del usuario y contraseña del email 
    // que sera usado remitente
    // =============================================================== 
    var mObjEmailParameters = Ax.db.executeQuery(`
        <select>
            <columns>
                crp_email_parameters.email_adress,
                crp_email_parameters.email_pass
            </columns>
            <from table='crp_email_parameters'/>
            <where>
                email_type = ?
                AND email_bbdd = ?
            </where>
        </select>
    `, pStrTypeEmail, mStrDBName).toOne();

    mStrEmailUser       = mObjEmailParameters.email_adress;
    mStrEmailPassword   = mObjEmailParameters.email_pass;

    // ===============================================================
    // Facturas en estado de error y duplicados.
    // ===============================================================
    var mRsDuplicateInvoices = Ax.db.executeQuery(`
        <select>
            <columns>
                pe_msg_xml_proveed.msg_id
            </columns>
            <from table='pe_msg_xml_proveed'/>
            <where>
                msg_status = 'E'
                AND msg_error LIKE '%i_gcomfach4%'
            </where>
        </select>
    `);

    // ===============================================================
    // Actualizado del estado a Descartado (D) y el mensaje de error.
    // ===============================================================
    mRsDuplicateInvoices.array.forEach(mObjFactura => {
        Ax.db.update("pe_msg_xml_proveed", {
            msg_status: 'D',
            msg_error: 'Documento duplicado, ya procesado.'
        }, {
            msg_id: mObjFactura.msg_id
        });
    });

    // ===============================================================
    // Construye y envía el email a CRP para informar 
    // sobre errores funcionales.
    // ===============================================================
    __build_and_send_email(mObjErrorFunctional, 0); 

    // ===============================================================
    // Construye y envía el email a Deister para informar 
    // sobre errores tecnicos.
    // ===============================================================
    __build_and_send_email(mObjErrorTechnical, 1); 

} 