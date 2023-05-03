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
 *  JS:  gcomfach_GenAssets_Services
 * 
 *  Version     : 1.0
 *  Date        : 02-05-2023
 *  Description : Construcción de arreglo de objetos con la estructura 
 *                de cabecera y lineas de factura de compras FMAN/FSER
 * 
 * 
 *  LOCAL FUNCTIONS:
 *  ==================
 *          __getDataHeader
 *          __getDataLines
 * 
 * 
 *  CALLED FROM:
 *  ==================
 * 
 * 
 *  PARAMETERS:
 *  ==================
 *          pIntCabids
 * 
 * 
 **/

function gcomfach_GenAssets_Services (pIntCabid) { 
    
    /*
    * DECLARACION DE FUNCIONES LOCALES
    */

    // OBTENER DATOS DE CABECERA
    function __getDataHeader(pIntCabid) {
        /**
         * Obtener datos de gcomfach
        **/
        var __mObjGcomfach = Ax.db.executeQuery(`
            <select>
                <columns>
                    gcomfach.cabid,
                    gcomfach.empcode,
                    gcomfach.docser,
                    gcomfach.fecha,
                    gcomfach.estcab,
                    gcomfach.date_contab,
                    gcomfach.tercer,
                    gcomfach.dtogen,
                    gcomfach.codpre,
                    gcomfach.codpar,
                    gcomfach.tipdoc,
                    gcomfach.delega,
                    gcomfach.depart,
                    gcomfach.tipdir,
                    gcomfach.refter,
                    gcomfach.dockey,
                    gcomfach.divisa,
                    gcomfach.cambio,
                    gcomfach.impfac,
                    gdeparta.proyec  gdeparta_proyec,
                    gdeparta.seccio  gdeparta_seccio,
                    gdeparta.ctaexp  gdeparta_ctaexp,
                    gdeparta.centro  gdeparta_centro
                </columns>
                <from table='gcomfach'>
                    <join type='left' table='gdeparta'>
                        <on>gcomfach.delega = gdeparta.delega</on>
                        <on>gcomfach.depart = gdeparta.depart</on>
                    </join>
                </from>
                <where>
                    gcomfach.cabid = ?
                </where>
            </select>
        `, pIntCabid).toOne().setRequired(`gcomfach.cabid = ${pIntCabid} not found`);

        return __mObjGcomfach;
    }

    // OBTENER DATOS DE LINEA
    function __getDataLines(pIntCabid) {

        /*
        * Variables locales
        */
        var _mArrLines = [];
        var _mIntPorcent = 0;
        var _mArrErrorLines = [];
        var _mArrCompAsignados;
        /**
         * Get data from gcomfacl
        **/
        var _mArrGcomfacl =  Ax.db.executeQuery(`
            <select>
                <columns>
                    gcomfacl.linid, 
                    gcomfacl.codart,
                    gcomfacl.varlog,
                    gcomfacl.canfac,
                    gcomfacl.impnet,
                    gcomfacl.desvar,
                    gcomfacl.orden,
                    gcomfacl.canfac,
                    gcomfacl.auxnum1,
                    garticul.nomart garticul_nomart,
                    gartfami.agrele gartfami_agrele,
                    gartfami.codinm gartfami_codinm, 
                    gartfami.serele gartfami_serele,
                    gartfami.codcta gartfami_codcta,
                    gartfami.codgru gartfami_codgru, 
                    gartfami.codfis gartfami_codfis,
                    gartfami.sisamo gartfami_sisamo
                </columns>
                <from table='gcomfacl'>
                    <join table='garticul'>
                        <on>gcomfacl.codart = garticul.codigo</on>
                    </join>
                    <join table='gartfami'>
                        <on>garticul.codfam = gartfami.codigo</on>
                    </join>
                </from>
                <where>
                    gcomfacl.cabid = ?
                </where>
            </select>
        `, pIntCabid).toJSONArray();

        _mArrGcomfacl.forEach(_mObjGcomfacl => {

            // Si no fue generado su componente
            if (_mObjGcomfacl.auxnum1 != 1) {
                
                // Obtener los componentes asignados a la linea
                _mArrCompAsignados = Ax.db.executeQuery(`
                    <select>
                        <columns>
                            id_cinmcomp,
                            porcen
                        </columns>
                        <from table='gcomfacl_dist_cinmcomp'/>
                        <where>
                            linid = ?
                        </where>
                    </select>
                `, _mObjGcomfacl.linid).toJSONArray();

                // Si existe asignacion de componentes a la linea
                if(_mArrCompAsignados.length > 0) {
                    _mIntPorcent = 0;

                    // Recorrido de componentes asignados a una linea
                    _mArrCompAsignados.forEach(_mObjCompAsig => {
                        _mIntPorcent += _mObjCompAsig.porcen
                        if (_mIntPorcent>100){
                            _mArrErrorLines.push(_mObjGcomfacl.linid)
                        }
                    })
                    _mArrLines.push(_mObjGcomfacl);
                }
                // console.log('L->', _mObjGcomfacl);

            }
        });
        // console.log(_mArrErrorLines);
        if(_mArrErrorLines.length > 0) {
            throw `Las lineas superan el 100% para los componentes asignados: [${_mArrErrorLines}].`;
        }
        return _mArrLines;
    }

    /*
    * DECLARACION DE VARIABLES GLOBALES
    */
    var mArrAssetSrc = [];
    var mIntExistDatc = 0;

    /*
    * INICIO DE LA TRANSACCION
    */

    // Obtiene datos de la cabecera
    var mObjGcomfach = __getDataHeader(pIntCabid);
    // console.log(mObjGcomfach);

    // Obtiene datos de la linea con componentes asignados
    var mArrDataLines = __getDataLines(pIntCabid);

    console.log('Num. Lineas', mArrDataLines.length);

    // Si existen lineas con componentes asignados
    if (mArrDataLines.length > 0) {
        console.log('Con componentes asignados');
        
        mArrDataLines.forEach(mRowGcomfacl => {
            mIntExistDatc = 0;
            // console.log(mRowGcomfacl);
            // if (mRowGcomfacl.gartfami_codinm != null) {
                /**
                 * En caso de ser una línea por redondeo, se omite
                 **/
                if (mRowGcomfacl.orden == -999){
                    return;
                }
                
                /**
                 * Validar si existe datos contables asociados a 
                 * las líneas.
                 **/
                var mIntCountExistDatc = Ax.db.executeGet(`
                    SELECT COUNT(*)
                    FROM gcomfacl_datc
                    WHERE gcomfacl_datc.linid = ?
                `, mRowGcomfacl.linid);
                
                if(mIntCountExistDatc >0){ mIntExistDatc = 1}

                // Creacion de arreglo de objetos
                mArrAssetSrc.push({
                    // tipo_proceso     :  mObjGcomfach.tipo_proceso,
                    empcode          :  mObjGcomfach.empcode, 
                    tipdoc           :  mObjGcomfach.tipdoc,          
                    delega           :  mObjGcomfach.delega,         
                    depart           :  mObjGcomfach.depart,         
                    fecha            :  mObjGcomfach.fecha,         
                    tercer           :  mObjGcomfach.tercer,         
                    tipdir           :  mObjGcomfach.tipdir,         
                    terenv           :  mObjGcomfach.tercer,        
                    direnv           :  mObjGcomfach.tipdir,        
                    docser           :  mObjGcomfach.docser,         
                    refter           :  mObjGcomfach.refter,         
                    dtogen           :  mObjGcomfach.dtogen,         
                    codpre           :  mObjGcomfach.codpre,         
                    codpar           :  mObjGcomfach.codpar,         
                    dockey           :  mObjGcomfach.dockey,

                    divisa           :  mObjGcomfach.divisa,
                    cambio           :  mObjGcomfach.cambio,
                    impfac           :  mObjGcomfach.impfac,

                    gdeparta_proyec  :  mObjGcomfach.gdeparta_proyec,     
                    gdeparta_seccio  :  mObjGcomfach.gdeparta_seccio,
                    gdeparta_ctaexp  :  mObjGcomfach.gdeparta_ctaexp,
                    gdeparta_centro  :  mObjGcomfach.gdeparta_centro, 
                                        
                    docid            :  mRowGcomfacl.linid,                   
                    codart           :  mRowGcomfacl.codart,                   
                    varlog           :  mRowGcomfacl.varlog,
                    canmov           :  mRowGcomfacl.canfac,
                    impnet           :  mRowGcomfacl.impnet,
                    canfac           :  mRowGcomfacl.canfac,
                    desvar           :  mRowGcomfacl.desvar || mRowGcomfacl.garticul_nomart,
                    exist_datc       :  mIntExistDatc != 0 ? mIntExistDatc : mRowGcomfacl.exist_datc,
                    gartfami_codinm  :  mRowGcomfacl.gartfami_codinm,
                    gartfami_serele  :  mRowGcomfacl.gartfami_serele,
                    gartfami_agrele  :  mRowGcomfacl.gartfami_agrele,
                    gartfami_codcta  :  mRowGcomfacl.gartfami_codcta,
                    gartfami_codgru  :  mRowGcomfacl.gartfami_codgru,
                    gartfami_codfis  :  mRowGcomfacl.gartfami_codfis,
                    gartfami_sisamo  :  mRowGcomfacl.gartfami_sisamo
                });

            // }
        });

        if (mArrAssetSrc.length > 0) {
            console.log('Enviar a generar elementos y componentes');
            console.log(mArrAssetSrc);
            // console.log(mArrAssetSrc[0]);
            /**
             * Genera elementos y componentes de activos fijos.
            **/
            
            // Ax.db.call("gdoc_GenAssets_Services", pIntCabid, mArrAssetSrc);
            gdoc_GenAssets_Services(pIntCabid, mArrAssetSrc);

        }
    } else {
        console.log('Sin componentes asignados');
    }
    
} 


/************************************************************************************************************************************/
/************************************************************************************************************************************/


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
 *  Version     : 1.0
 *  Date        : 02-05-2023
 *  Description : Construcción de arreglo de objetos con la estructura 
 *                de cabecera y lineas de factura de compras FMAN/FSER
 * 
 * 
 *  LOCAL FUNCTIONS:
 *  ==================
 *          __getDataHeader
 *          __getDataLines
 * 
 * 
 *  CALLED FROM:
 *  ==================
 * 
 * 
 *  PARAMETERS:
 *  ==================
 *          pIntCabids
 * 
 * 
 **/
function gdoc_GenAssets_Services (pIntCabid, pArrAssetSrc) {
    // var pStrTabname = 'gcomfach';
    var pStrTabline = 'gcomfacl';
    var mIntPorcen = 0;

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

    /*
     * DEFINICION DE VARIABLES GLOBALES
     */
    // var mStrTabdatc     = pStrTabline + "_datc";
    var mArrDataCompAsig = '';
    var mObjDataComp;
    var mObjAddonsData  = {
        accion : 'BUT_CINMCOMP/ACTION_CINMCOMP',
        tipo_proceso: 'SER',
        cparpreLinid: ''
    };
    var mStrAreaDestino = '';
    /**
     * Estructura con la información requerida para generar componentes
     **/
    var mObjCinmdata = {
        empcode : null,                                         // Company
        codinm  : null,                                         // Property
        serele  : null,                                         // Element/series code
        nomele  : null,                                         // Element/component name.
                                                                                                 
        codcta  : null,                                         // Accounting group
        proyec  : null,                                         // Project
        seccio  : null,                                         // Section
        ctaexp  : null,                                         // Operating account
        centro  : null,                                         // Center  

        codgru  : null,                                         // Fiscal group
        codfis  : null,                                         // Fiscal Code

        tipcom  : null,                                         // Tipo de componente
        
        sisamo  : null,                                         // Amortization system
        codpre  : null,                                         // Budget
        codpar  : null,                                         // Partida

        fecha   : null,                                         // Registration date
        fecdoc  : null,                                         // Delivery note or invoice date
        fecini  : null,                                         // Amortization start date
        jusser  : null,                                         // Voucher
        docser  : null,                                         // Document
        refter  : null,                                         // Reference
        tercer  : null,                                         // Third company
        unidad  : null,                                         // Unit
        valinv  : null,                                         // Inventory value

        tabname : null,
        docid   : null,
        divisa  : null,                                         // Currency invoice
        cambio  : null,                                         // Money exchange
        impfac  : null                                          // Invoice amount
    }

    // Objeto con datos adicionales de la cabecera
    // mObjAddonsData = Ax.db.executeQuery(`
    //     SELECT  gcomfach.divisa,
    //             gcomfach.cambio,
    //             gcomfach.impfac
    //       FROM  gcomfach
    //      WHERE  gcomfach.cabid = ?
    // `, pIntCabid).toOne();

    // console.log(mObjAddonsData);

    /* AREA DESTINO - PENDIENTE */
    mStrAreaDestino = __getAreaDestino(pIntCabid);
    // console.log(mStrAreaDestino);

    // Procesar rs con datos de origen necesarios para generar los activos fijos.
    pArrAssetSrc.forEach(mObjAssetSrc => {
        console.log('Objeto H-L', mObjAssetSrc);

        /**
         * Obtener los componentes asignados a la linea
        */
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
        // console.log('Tip. Componente', mArrDataCompAsig);

        // Recorrido de componentes asignados
        mArrDataCompAsig.forEach(mStrTipComp => {
            mIntPorcen = mStrTipComp.porcen;

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
            `, mStrTipComp.seqno).toOne();

            // console.log(mObjDataComp);
            // mObjAddonsData.tipcom       = mStrTipComp.tipcom;
            // console.log(mObjAddonsData);
            
            mObjCinmdata.empcode = mObjAssetSrc.empcode;        // empcode
            mObjCinmdata.codinm  = mObjDataComp.codinm          // codinm
            mObjCinmdata.serele  = mObjDataComp.codele;         // codele
            mObjCinmdata.nomele  = mObjAssetSrc.desvar;         // nomele
    
            mObjCinmdata.codcta  = mObjAssetSrc.gartfami_codcta;// codcta
            mObjCinmdata.proyec  = mObjAssetSrc.gdeparta_proyec;// proyec *
            mObjCinmdata.seccio  = mStrAreaDestino || mObjAssetSrc.gdeparta_seccio;// seccio
            mObjCinmdata.ctaexp  = mObjAssetSrc.gdeparta_ctaexp;// ctaexp *
            mObjCinmdata.centro  = mObjAssetSrc.gdeparta_Centro;// centro *
    
            mObjCinmdata.codgru  = mObjAssetSrc.gartfami_codgru;// codgru
            mObjCinmdata.codfis  = mObjAssetSrc.gartfami_codfis;// codfis

            mObjCinmdata.tipcom = mStrTipComp.tipcom;           // tipcom
                
            mObjCinmdata.sisamo  = mObjAssetSrc.gartfami_sisamo;// sisamo
            mObjCinmdata.codpre  = mObjAssetSrc.codpre;         // codpre *
            mObjCinmdata.codpar  = mObjAssetSrc.codpar;         // codpar *
    
            mObjCinmdata.fecha   = mObjAssetSrc.fecha;          // fecha
            mObjCinmdata.fecdoc  = mObjAssetSrc.fecha;          // fecdoc
            mObjCinmdata.fecini  = mObjAssetSrc.fecha;          // fecini * primer dia del sgt mes
            mObjCinmdata.jusser  = mObjAssetSrc.docser;         // jusser
            mObjCinmdata.docser  = mObjAssetSrc.docser;         // docser
            mObjCinmdata.refter  = mObjAssetSrc.refter;         // refter
            mObjCinmdata.tercer  = mObjAssetSrc.tercer;         // tercer
            mObjCinmdata.unidad  = mIntPorcen * mObjAssetSrc.canfac / 100;                           // unidad *
            mObjCinmdata.valinv  = mIntPorcen * mObjAssetSrc.impfac / 100;                           // valinv *
    
            mObjCinmdata.tabname = pStrTabline;                 // tabname
            mObjCinmdata.docid   = mObjAssetSrc.docid;          // docid

            mObjCinmdata.divisa   = mObjAssetSrc.divisa;        // divisa
            mObjCinmdata.cambio   = mObjAssetSrc.cambio;        // cambio
            mObjCinmdata.impfac   = mObjAssetSrc.impfac;        // impfac

            console.log('Param-1:', mObjCinmdata);
            console.log('Param-2', mObjAddonsData);
            var resCall = Ax.db.call('crp_cinmelemGenera', mObjCinmdata, mObjAddonsData);

            console.log('RES-CALL:', resCall);
            // Si retorna el id del componente
            if (resCall > 0) {
                // Actualiza el auxiliar de la linea
                Ax.db.update('gcomfacl', 
                    {
                        auxnum1 : 1
                    },
                    {
                        linid : mObjAssetSrc.docid
                    }
                );

                // Actualiza el importe de componente asigando a la linea
                Ax.db.update('gcomfacl_dist_cinmcomp', 
                    {
                        import : mIntPorcen * mObjAssetSrc.impfac / 100
                    },
                    {
                        id_dist_cinmcomp : mStrTipComp.id_dist_cinmcomp
                    }
                );

                console.log('YES-Update AUX');

            } else {
            console.log('NO');

            }
        });

    });

}



/************************************************************************************************************************************/
/************************************************************************************************************************************/

var pIntCabid = 14609;

gcomfach_GenAssets_Services(pIntCabid);