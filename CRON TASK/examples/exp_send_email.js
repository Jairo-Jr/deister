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
 *  JS: crp_task_anula_pedidos_compra
 *      Version:    V1.0
 *      Date:       2022.05.11                                          
 *      Description:    
 * 
 */
function crp_task_anula_pedidos_compra() {
     
    /**
     * Construimos las filas a agregar a la tabla.
     */ 
    function __build_html_row(pStrPedido, pDateToday, pStrProveedor, pHtmlRow){
        
        return pHtmlRow +  `<tr><td class="col-left">${pStrPedido}</td><td class="col-left">${pDateToday}</td><td class="col-left">${pStrProveedor}</td></tr>`;
    }

    /**
     * Construimos la tabla con las filas que enviarmos como argumento
     */
    function __build_html_table(pHtmlRows, pIntNumTotal, pDateToday){

        if (pIntNumTotal <= 0){

            return `<div class="tbl-header">
                         <p class="col-center">Para el día ${pDateToday} no se han realizado anulaciones de pedidos de compra.<p>
                    </div>`;
        }
        else{
             return `<div class="tbl-header">
                    <table cellspacing="0" border="0" class="tb-format">
                        <thead>
                            <tr>
                                <th class="borderhd col-left">Nro. Pedido</th>
                                <th class="borderhd col-left">Fecha</th>
                                <th class="borderhd col-left">Proveedor</th>                            
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
                </div>
                <p class="col-left" >(*) Muestra la lista de pedidos de compras anulados por demora excesiva.</p>`;
        }
    }
    
    /**
     * Construimos el html que enviaremos por e-mail 
     */
    function __build_html(pHtmlTable, pDateToday, pStrDBName){
      
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
                        <h1>[${pStrDBName}] Reporte diario de pedidos de compras anulados</h1>
                        <h4 class="center">Fecha: ${pDateToday}</h4>
                    </div>                
                    <div>
                        ${pHtmlTable}
                    </div>
                </body>
            </html>`;
    }
    

    /**
     * Función para enviar e-mail
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
        m_mailer.setSMTPUsername("cpefarmacia@crp.com.pe");
        m_mailer.setSMTPPassword("CPEFARMACIA2021");
        m_mailer.send(m_mail);
    }

    /**
     * Inicialización del log de procesos
     */
    mObjProcLog = require('clogproh');

    Ax.db.beginWork();
    mObjProcLog.start(arguments.callee.name, null, 0);
    Ax.db.commitWork();

    /**
     * Obtenemos el Id del log de procesos
     */
    var mIntLogId    = mObjProcLog.getLogId();
    
    /**
     * Definición de variables generales
     */
    var mStrDBName       = Ax.db.getPhysicalCode();
    var mStrEmailTo      = '';
    var mStrEmailBcc     = '';
    var mStrEmailSubject = `[DB: ${mStrDBName}] Pedidos de compras >> Reporte diario de anulaciones`;
    
    switch(mStrDBName){
        
        case 'ghq_crp_qa'  :
            mStrEmailTo      = 'mcerna@crp.com.pe, monica.verastegui@oelois.com, gti-axional@crp.com.pe, dcachuan@crp.com.pe';
            mStrEmailBcc     = 'evelyn.galarza@deister.pe, jmolina@deister.es, paul.rojas@deister.pe, omar.concepcion@deister.pe, mrocha@deister.pe, cbordes@deister.es, marlon.fernandez@deister.pe, cesar.guevara@deister.pe, cristel.castaneda@deister.pe, cesar.castillo@deister.pe';
            break;
            
        case 'ghq_crp_pro'  :
            mStrEmailTo      = 'mcoronado@crp.com.pe, mcerna@crp.com.pe, faralmacen@crp.com.pe, farmaciacompras@crp.com.pe';
            mStrEmailBcc     = 'mrocha@deister.pe, cbordes@deister.es, evelyn.galarza@deister.pe, jmolina@deister.es, paul.rojas@deister.pe, omar.concepcion@deister.pe, marlon.fernandez@deister.pe, cesar.guevara@deister.pe, cristel.castaneda@deister.pe, cesar.castillo@deister.pe';
            mStrEmailSubject = `Pedidos de compras >> Reporte diario de anulaciones`;
            break;
            
        default :
            mStrEmailTo      = 'evelyn.galarza@deister.pe, jmolina@deister.es, paul.rojas@deister.pe, omar.concepcion@deister.pe';
            mStrEmailBcc     = 'mrocha@deister.pe, cbordes@deister.es, marlon.fernandez@deister.pe, cesar.guevara@deister.pe, cristel.castaneda@deister.pe, cesar.castillo@deister.pe';
    }

    var mStrEmailFrom         = 'no-reply@crp.com.pe';
    var mStrEmailErrorBody    = '';
    var mStrEmailContent      = '';
    var mStrScript            = 'crp_task_anula_pedidos_compra';
    var mIntNumPedAnulados    = 0;
    var mHtmlRow              = '';
    var mDateToday            = new Ax.util.Date();
    var mDateMonth            = mDateToday.getMonth() +1;
    var mStrDate              = mDateToday.getDate() + '/' + mDateMonth + '/' + mDateToday.getFullYear();
    
    // ===================================================================================
    // 10/01/2023: Solicitado por CRP
    //
    // Proceso NO debe considerar a Logística
    // ==================================================================================
    
    /**
     * Obtenemos los pedidos de compra que cumpl`an la condición de anulación:
     *  - estado en P: Parcial o N: Pendiente
     *  - estado de cabecera validado
     *  - fecfin <= Hoy 
     */ 
    var mRsGcomped = Ax.db.executeQuery(`
        <select secure='true'>
            <columns>
                gcompedh.cabid,
                gcompedh.fecha,
                gcompedh.docser,
                gcompedh.tercer,
                ctercero.nombre
            </columns>
            <from table='gcompedh'>
                <join type='left' table='ctercero'>
                    <on>gcompedh.tercer = ctercero.codigo</on>
                </join>
            </from>
            <where>
                    gcompedh.estcab IN ('V', 'P') <!-- Ahora los pedidos en provisional, también se anulan. 29-09-2022, ajuste por parte de Miguel -->    
                AND gcompedh.estado IN ('N', 'P')
                AND gcompedh.fecfin &lt; <today />
                AND gcompedh.tercer NOT IN (SELECT codigo FROM gproveed WHERE auxchr2='S')
                AND gcompedh.date_created != gcompedh.fecfin
                AND gcompedh.tipdoc NOT IN ('PLOG')
            </where>
        </select>
    `);

    /**
     * Obtenemos el código de bloqueo
     */ 
    var mStrCodmot = Ax.db.executeGet(`
            <select>
                <columns>
                    MAX(gmotanul.codigo)
                </columns>
                <from table='gmotanul'/>
            </select>
        `);

    /**
     * Definimos la nota de anulación
     */ 
    var mStrComent = 'Proceso realizado por tarea automática';

    for (var mRowGcomped of mRsGcomped){
        try{
            
            /**
             * Iniciar transacción
             */
            Ax.db.beginWork(); 

            Ax.db.update('gcompedh', 
                {
                    post_hupd : 1
                },
                {
                    cabid : mRowGcomped.cabid
                }
             );
             
            /**
             * Revalidate the order
             */
            Ax.db.call("gcompedh_Valida", mRowGcomped.cabid);

            Ax.db.call('gcompedh_Anular1', mRowGcomped.cabid, mStrCodmot, mStrComent, '1=1');
            
            /**
             * Se marca el pedido de compra para distnguir anulaciones de 
             * cancelación por tiempo excedido
             */
            Ax.db.update('gcompedh', 
                {
                    auxnum5 : 1
                },
                {
                    cabid : mRowGcomped.cabid
                }
             );
    
            mObjProcLog.log(null, null, null, null, null, null, mRowGcomped.cabid, null);
            
            mIntNumPedAnulados++;
            
            mHtmlRow = __build_html_row(mRowGcomped.docser, mRowGcomped.fecha, mRowGcomped.tercer + " - " + mRowGcomped.nombre, mHtmlRow);

            console.log('==============================');
            console.log('Pedido anulado: ' + mRowGcomped);
            console.log('==============================');

            Ax.db.commitWork();
           
        }catch (e) {

            Ax.db.rollbackWork();

            mObjProcLog.err(e, e.message, null, null, mRowGcomped.cabid, null);

            console.log('==============================');
            console.log(e.message);
            console.log(mRowGcomped.cabid);
            console.log('==============================');

        }
    } 
    
    var mHtmlTable = __build_html_table(mHtmlRow, mIntNumPedAnulados, mStrDate);
    var mHtmlBody  = __build_html(mHtmlTable, mStrDate, mStrDBName);
    
    __send_mail( mStrEmailFrom,
                 mStrEmailTo,
                 mStrEmailBcc,
                 mStrEmailSubject,
                 mHtmlBody
    );

    /**
     * Cerramos el log de procesos
     */
     mObjProcLog.end();

     /**
      * Retornamos el Id del log.
      */
     return mIntLogId;
          
}