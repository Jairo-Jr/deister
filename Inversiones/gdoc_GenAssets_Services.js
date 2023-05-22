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
 * 
 *  JS:  gdoc_GenAssets_Services
 * 
 *  Version     : 1.2
 *  Date        : 03-05-2023
 *  Description : Construcción de objeto en base a datos de cabecera, linea 
 *                y registro de componentes asignados a la linea.
 * 
 * 
 *  LOCAL FUNCTIONS:
 *  ==================
 *          __getAreaDestino
 * 
 * 
 *  CALLED FROM:
 *  ==================
 *          JS Function:    gcomfach_GenAssets_Services
 * 
 *  PARAMETERS:
 *  ==================
 *          @param      {integer}       pIntCabid         Identificador de la factura de compras
 *          @param      {Array}         pArrAssetSrc      Arreglo de objetos que contiene información de factura de compras
 * 
 **/
function gdoc_GenAssets_Services (pIntCabid, pArrAssetSrc) {

    // ===============================================================
    // DECLARACIÓN DE FUNCIONES LOCALES
    // ===============================================================

    /**
     * LOCAL FUNCTION: __getAreaDestino
     * 
     * Función local que obtienes el área destino de la solicitud     
     * 
     *      @param   {integer}   pIntCabid       Id. de la factura    
     */ 
    function __getAreaDestino(pIntCabid) {
        
        var mStrDepartSol = Ax.db.executeGet (`
            <select>
                <columns>
                    FIRST 1
                    NVL(gcomsoll.auxchr2, gcomsolh.depart) depart_sol
                </columns>
                <from table='gcomsoll'>
                    <join table='gcomsolh'>
                        <on>gcomsoll.cabid = gcomsolh.cabid</on>
                        <join table='gcomsold'>
                            <on>gcomsolh.tipdoc = gcomsold.codigo</on>
                        </join>
                    </join>
                    <join table='gcompedl_lnk'>
                        <on>gcompedl_lnk.lnk_cabori  = gcomsoll.cabid</on>
                        <on>gcompedl_lnk.lnk_linori  = gcomsoll.linid</on>
                        <join table='gcompedl'>
                            <on>gcompedl_lnk.lnk_tabori = 'gcomsolh'</on>
                            <on>gcompedl_lnk.linid   = gcompedl.linid</on>
                            <join table='gcompedh'>
                                <on>gcompedl.cabid = gcompedh.cabid</on>
                                <join table='gcomalbl'>
                                    <on>gcomalbl.cabori = gcompedl.cabid</on>
                                    <on>gcomalbl.tabori = 'gcompedh'</on>
                                        <join table='gcomalbh'>
                                        <on>gcomalbl.cabid = gcomalbh.cabid</on>
                                        <join table='gcomfacl'>
                                            <on>gcomalbl.cabid = gcomfacl.cabori</on>
                                            <on>gcomfacl.tabori = 'gcommovh'</on>
                                        </join>
                                    </join>
                                </join>
                            </join>
                        </join>
                    </join>
                </from>
                <where>
                        gcomsold.circui = 'LOG'
                    AND gcomsolh.estcab = 'V'
                    AND gcomfacl.cabid  = ?
                </where>
            </select>
        `, pIntCabid);

        var mStrSeccion = Ax.db.executeGet(`
            SELECT gdeparta.seccio
              FROM gdeparta
             WHERE gdeparta.depart = ?
        `, mStrDepartSol);     
        
        return mStrSeccion;
    }

    // ===============================================================
    // DECLARACIÓN DE VARIABLES GLOBALES
    // =============================================================== 
    var mObjDataComp;

    var mIntId_dist_cinmcomp    = 0;
    var mStrTipcom              = '';
    var mIntSeqno               = 0;
    var mIntPorcen              = 0;

    var mBoolCasoAgrupado       = false;
    var mIntNumUnidades         = 0;
    var mmBcValinv              = 0;
    var mIntCantComp            = 0;
    var mStrTabline             = 'gcomfacl';

    var mArrDataCompAsig        = '';
    var mStrAreaDestino         = '';
    var resCall                 = 0;
    var mObjAddonsData          = {
        accion       : 'BUT_CINMCOMP/ACTION_CINMCOMP',
        tipo_proceso : 'SER',
        cparpreLinid : ''
    };

    // ===============================================================
    // Estructura de objeto requerida para la generación 
    // de componentes.
    // ===============================================================
    var mObjCinmdata = {
        empcode : null,     // Company
        codinm  : null,     // Property
        serele  : null,     // Element/series code
        nomele  : null,     // Element/component name.
                                                                                                 
        codcta  : null,     // Accounting group
        proyec  : null,     // Project
        seccio  : null,     // Section
        ctaexp  : null,     // Operating account
        centro  : null,     // Center  

        codgru  : null,     // Fiscal group
        codfis  : null,     // Fiscal Code

        tipcom  : null,     // Tipo de componente
        
        sisamo  : null,     // Amortization system
        codpre  : null,     // Budget
        codpar  : null,     // Partida

        fecha   : null,     // Registration date
        fecdoc  : null,     // Delivery note or invoice date
        fecini  : null,     // Amortization start date
        jusser  : null,     // Voucher
        docser  : null,     // Document
        refter  : null,     // Reference
        tercer  : null,     // Third company
        unidad  : null,     // Unit
        valinv  : null,     // Inventory value

        tabname : null,     // line table name
        docid   : null,     // document identifier
        divisa  : null,     // Currency invoice
        cambio  : null,     // Money exchange
        impfac  : null      // Invoice amount
    }

    // ===============================================================
    // Se obtiene el area de destino
    // ===============================================================
    mStrAreaDestino = __getAreaDestino(pIntCabid);

    // ===============================================================
    // Recorrido del arreglo que contiene información de cabecera 
    // y lineas de la factura de compras.
    // ===============================================================
    pArrAssetSrc.forEach(mObjAssetSrc => {
        
        // ===============================================================
        // Se obtiene el registro de los componentes asignados a la linea
        // ===============================================================
        mArrDataCompAsig =  Ax.db.executeQuery(`
            <select>
                <columns>
                    id_dist_cinmcomp,
                    tipcom, 
                    id_cinmcomp seqno, 
                    porcen
                </columns>
                <from table='gcomfacl_dist_cinmcomp'/>
                <where>
                    linid = ?
                </where>
            </select>
        `, mObjAssetSrc.docid).toJSONArray(); 

        mIntCantComp = mArrDataCompAsig.length;

        /**
         * LÓGICA PARA MAESTRO DE ARTÍCULOS AGRUPADOS: 
         * Si es solo un registro por 100%
         * - Si es agrupado (agrele = 1) crear un componente por el total de unidades
         * - Si no es agrupado (agrele = 0 / null) crear el maximo de componentes posible por una unidad
         */
        if (mArrDataCompAsig.length == 1 && mArrDataCompAsig[0].porcen == 100) {
            
            // ===============================================================
            // Identificado de caso especial para agrupados
            // ===============================================================
            mBoolCasoAgrupado = true;

            mIntId_dist_cinmcomp    = mArrDataCompAsig[0].id_dist_cinmcomp;
            mStrTipcom              = mArrDataCompAsig[0].tipcom;
            mIntSeqno               = mArrDataCompAsig[0].seqno;
            mIntPorcen              = mArrDataCompAsig[0].porcen;

            // ===============================================================
            // Si se encuentra agrupado
            // ===============================================================
            if (mObjAssetSrc.gartfami_agrele == 1) {
                
                mIntCantComp = 1;
                mIntNumUnidades = mObjAssetSrc.canmov;
                mmBcValinv = mObjAssetSrc.impfac;
            } else {
                
                // ===============================================================
                // Si no se encuentra agrupado
                // ===============================================================
                mIntCantComp = mObjAssetSrc.canmov;
                mIntNumUnidades = 1;
                mmBcValinv = mObjAssetSrc.impfac / mObjAssetSrc.canmov;
            }
            
        }

        // ===============================================================
        // Iteración del número de componentes a generarse
        // ===============================================================
        for (let i=0; i < mIntCantComp; i++) {

            // ===============================================================
            // Si no es del caso especial de agrupados
            // ===============================================================
            if (!mBoolCasoAgrupado) {

                mIntId_dist_cinmcomp    = mArrDataCompAsig[i].id_dist_cinmcomp;
                mStrTipcom              = mArrDataCompAsig[i].tipcom;
                mIntSeqno               = mArrDataCompAsig[i].seqno;
                mIntPorcen              = mArrDataCompAsig[i].porcen;

                mIntNumUnidades         = mIntPorcen * mObjAssetSrc.canmov / 100;
                mmBcValinv              = mIntPorcen * mObjAssetSrc.impfac / 100;
            }

            // ===============================================================
            // Obtención de información del componente según su identificador
            // ===============================================================
            mObjDataComp =  Ax.db.executeQuery(`
                <select first='1'>
                    <columns>
                        codinm,
                        codele
                    </columns>
                    <from table='cinmcomp'/>
                    <where>
                        seqno = ?
                    </where>
                </select>
            `, mIntSeqno).toOne();

            // ===============================================================
            // Asignacion de información al objeto
            // ===============================================================
            mObjCinmdata.empcode = mObjAssetSrc.empcode;                                // empcode
            mObjCinmdata.codinm  = mObjDataComp.codinm                                  // codinm
            mObjCinmdata.serele  = mObjDataComp.codele;                                 // codele
            mObjCinmdata.nomele  = mObjAssetSrc.desvar;                                 // nomele
    
            mObjCinmdata.codcta  = mObjAssetSrc.gartfami_codcta;                        // codcta
            mObjCinmdata.proyec  = mObjAssetSrc.gdeparta_proyec;                        // proyec
            mObjCinmdata.seccio  = mStrAreaDestino || mObjAssetSrc.gdeparta_seccio;     // seccio
            mObjCinmdata.ctaexp  = mObjAssetSrc.gdeparta_ctaexp;                        // ctaexp
            mObjCinmdata.centro  = mObjAssetSrc.gdeparta_Centro;                        // centro
    
            mObjCinmdata.codgru  = mObjAssetSrc.gartfami_codgru;                        // codgru
            mObjCinmdata.codfis  = mObjAssetSrc.gartfami_codfis;                        // codfis

            mObjCinmdata.tipcom  = mStrTipcom;                                          // tipcom
                
            mObjCinmdata.sisamo  = mObjAssetSrc.gartfami_sisamo;                        // sisamo
            mObjCinmdata.codpre  = mObjAssetSrc.codpre;                                 // codpre
            mObjCinmdata.codpar  = mObjAssetSrc.codpar;                                 // codpar
    
            mObjCinmdata.fecha   = mObjAssetSrc.fecha;                                  // fecha
            mObjCinmdata.fecdoc  = mObjAssetSrc.fecha;                                  // fecdoc
            mObjCinmdata.fecini  = mObjAssetSrc.fecha;                                  // fecini
            mObjCinmdata.jusser  = mObjAssetSrc.docser;                                 // jusser
            mObjCinmdata.docser  = mObjAssetSrc.docser;                                 // docser
            mObjCinmdata.refter  = mObjAssetSrc.refter;                                 // refter
            mObjCinmdata.tercer  = mObjAssetSrc.tercer;                                 // tercer
            mObjCinmdata.unidad  = mIntNumUnidades;                                     // unidad
            mObjCinmdata.valinv  = mmBcValinv;                                          // valinv
            mObjCinmdata.impfac  = mmBcValinv;                                          // impfac 
    
            mObjCinmdata.tabname = mStrTabline;                                         // tabname
            mObjCinmdata.docid   = mObjAssetSrc.docid;                                  // docid

            mObjCinmdata.divisa  = mObjAssetSrc.divisa;                                 // divisa
            mObjCinmdata.cambio  = mObjAssetSrc.cambio;                                 // cambio

            // ===============================================================
            // Se llama a la funcion que genera el componente
            // ===============================================================
            resCall = Ax.db.call('crp_cinmelemGenera', mObjCinmdata, mObjAddonsData);

            // ===============================================================
            // Si la respuesta de la función es el identificador del 
            // componente generado, se actualiza el auxiliar de la línea y 
            // el importe del registro del componente asignado
            // ===============================================================
            if (resCall > 0) {
                
                // ===============================================================
                // Actualiza el auxiliar de la linea
                // ===============================================================
                Ax.db.update('gcomfacl', 
                    {
                        auxnum1 : 1
                    },
                    {
                        linid   : mObjAssetSrc.docid
                    }
                );

                // ===============================================================
                // Actualiza el importe de componente asigando a la linea
                // ===============================================================
                Ax.db.update('gcomfacl_dist_cinmcomp', 
                    {
                        import : mIntPorcen * mObjAssetSrc.impfac / 100
                    },
                    {
                        id_dist_cinmcomp : mIntId_dist_cinmcomp
                    }
                );
            }
        }
    });
}