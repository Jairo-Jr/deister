function limpieza_facturas() { 

    /**
     * Construimos las filas a agregar a la tabla.
     */ 
    function __build_html_row(pStrPedido, pDateToday, pStrProveedor, pHtmlRow){
        
        return pHtmlRow +  `<tr><td class="col-left">${pStrPedido}</td><td class="col-left">${pDateToday}</td><td class="col-left">${pStrProveedor}</td></tr>`;
    }

    /**
     * Construimos la tabla con las filas que enviarmos como argumento
     */
    function __build_html_table(pHtmlRows, pIntNumTotal){

        return `<div class="tbl-header">
                    <table cellspacing="0" border="0" class="tb-format">
                        <thead>
                            <tr>
                                <th class="borderhd col-left">Id.</th>
                                <th class="borderhd col-left">Mensaje error</th>
                                <th class="borderhd col-left">RUC</th>                            
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
     * Construimos el html que enviaremos por e-mail 
     */
    function __build_html(pHtmlTable, pDateToday){
      
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
                        <h1>REPORTE DE FACTURAS CON ERRORES TECNICOS</h1>
                        <h4 class="center">Fecha: ${pDateToday}</h4>
                    </div>                
                    <div>
                        ${pHtmlTable}
                    </div>
                </body>
            </html>`;
    }

    // ===============================================================
    // Función para enviar e-mail
    // ===============================================================
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
        m_mailer.setSMTPUsername("cpefarmacia@crp.com.pe");
        m_mailer.setSMTPPassword("CPEFARMACIA2021");
        m_mailer.send(m_mail);
    } 

    // ===============================================================
    // Definicion de variables
    // ===============================================================
    var mStrEmailFrom         = 'no-reply@crp.com.pe';
    var mStrEmailTo      = 'jairo.huallpa@deister.pe';
    var mStrEmailBcc     = 'jairo.huallpa@deister.pe';
    var mStrEmailSubject = `Error presentado en facturas`;
    var mDateToday            = new Ax.util.Date();
    var mDateMonth            = mDateToday.getMonth() +1;
    var mStrDate              = mDateToday.getDate() + '/' + mDateMonth + '/' + mDateToday.getFullYear();
    var mHtmlRow              = '';

    // ===============================================================
    // Facturas en estado de error y duplicados.
    // ===============================================================
    var mRsFacturasDuplicadas = Ax.db.executeQuery(`
        <select first='5'>
            <columns>
                *
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
    // mRsFacturasDuplicadas.array.forEach(mObjFactura => {
    //     Ax.db.update("pe_msg_xml_proveed", {
    //         msg_status: 'D',
    //         msg_error: 'Documento duplicado, ya procesado.'
    //     }, {
    //         msg_id: mObjFactura.msg_id
    //     });
    // });

    // ===============================================================
    // Facturas con periodo cerrado
    // ===============================================================
    var mRsFacturasCerradas = Ax.db.executeQuery(`
        <select>
            <columns>
                msg_id,
                msg_error,
                msg_ruc
            </columns>
            <from table='pe_msg_xml_proveed'/>
            <where>
                msg_status = 'E'
                AND msg_error LIKE '%periodo%Cerrado%';
            </where>
        </select>
    `); 
    var mNumRows = 0;
    mRsFacturasCerradas.forEach(mObjFacturaCerrada => { 
        mHtmlRow = __build_html_row(mObjFacturaCerrada.msg_id, mObjFacturaCerrada.msg_error, mObjFacturaCerrada.msg_ruc, mHtmlRow);
        mNumRows++;
    });
    // ===============================================================
    // Envio de correo, informando que sea regularizado
    // =============================================================== 
    /**
     * SEND EMAIL
     */ 
    if (mNumRows > 0) { 
        var mHtmlTable = __build_html_table(mHtmlRow, mNumRows);
        var mHtmlBody  = __build_html(mHtmlTable, mStrDate);

        __send_mail(mStrEmailFrom,
            mStrEmailTo,
            mStrEmailBcc,
            mStrEmailSubject,
            mHtmlBody
        );
    }
    

    // ===============================================================
    // Facturas con errores tecnicos
    // ===============================================================
    var mRsFacturasErrorTecnico = Ax.db.executeQuery(`
        <select>
            <columns>
                msg_id,
                msg_error,
                msg_ruc
            </columns>
            <from table='pe_msg_xml_proveed'/>
            <where>
                msg_status = 'E'
                AND (msg_error LIKE '%conversion%failed%' 
                    OR msg_error LIKE '%Invalid%in%' 
                    OR msg_error LIKE '%column%')
            </where>
        </select>
    `);

    // ===============================================================
    // Envio de correo, informando que sea regularizado
    // =============================================================== 
    /**
     * SEND EMAIL
     */
    // __send_mail(mStrEmailFrom,
    //     mStrEmailTo,
    //     mStrEmailBcc,
    //     mStrEmailSubject,
    //     mHtmlBody
    // );

}