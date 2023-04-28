

/*
 * FUNCIONES
 * 
 * PARAM
 *      pIntCabid       Id de la cabecera
 *      mArrAssetSrc    Arreglo de objeto cabecera+linea
 */
function generateElemCompActFijo(pIntCabid, mArrAssetSrc) {
    var pStrTabname = 'gcomfach';
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
     * DEFINICION DE VARIABLES LOCALES
     */
    var mStrTabdatc     = pStrTabline + "_datc";
    var mObjAddonsData  = {};
    var mStrAreaDestino = '';
    /**
     * Estructura con la información requerida para generar los activos fijos.
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
    mObjAddonsData = Ax.db.executeQuery(`
        SELECT  gcomfach.divisa,
                gcomfach.cambio,
                gcomfach.impfac
          FROM  gcomfach
         WHERE  gcomfach.cabid = ?
    `, pIntCabid).toOne();

    // console.log(mObjAddonsData);

    /* AREA DESTINO - PENDIENTE */
    mStrAreaDestino = __getAreaDestino(pIntCabid);
    // console.log(mStrAreaDestino);

    // Procesar rs con datos de origen necesarios para generar los activos fijos.
    mArrAssetSrc.forEach(mObjAssetSrc => {
        console.log('Objeto H-L', mObjAssetSrc);

        /**
         * Tipo del componente
        */
        var mArrTipComp =  Ax.db.executeQuery(`
            <select>
                <columns>
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
        // console.log('Tip. Componente', mArrTipComp);

        
        

        mArrTipComp.forEach(mStrTipComp => {
            mIntPorcen = mStrTipComp.porcen;

            var mObjDataComp =  Ax.db.executeQuery(`
                <select first='1'>
                    <columns>
                        codinm,codele
                    </columns>
                    <from table='cinmcomp'/>
                    <where>
                        seqno = ?
                    </where>
                </select>
            `, mStrTipComp.seqno).toOne();

            // console.log(mObjDataComp);
            mObjAddonsData.tipcom       = mStrTipComp.tipcom;
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

            console.log('Param-1:', mObjCinmdata);
            console.log('Param-2', mObjAddonsData);
            Ax.db.call('crp_cinmelemGenera', mObjCinmdata, mObjAddonsData);
        });

    });

}
/*******************************************************************************************************************/

// Identificador de la cabecera
var pIntCabid = 14602;
// var pIntCabid = 14683;

/*
 * DECLARACION DE FUNCIONES LOCALES
 */
function __getDataHeader(pIntCabid) {
    /**
     * Get data from gcomfach
    **/
    var mObjGcomfach = Ax.db.executeQuery(`
        <select>
            <columns>
                'INV' tipo_proceso,
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

    return mObjGcomfach;
}

function __getDataLines(pIntCabid, pIntImpfac) {
    var mArrLines = [];
    var mIntPorcent = 0;
    var mArrErrorLines = [];
    /**
     * Get data from gcomfacl
    **/
    var mRsGcomfacl =  Ax.db.executeQuery(`
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

    mRsGcomfacl.forEach(objLines => {

        var existCmp = Ax.db.executeQuery(`
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
        `, objLines.linid).toJSONArray();

        if(existCmp.length > 0) {
            mIntPorcent = 0;
            existCmp.forEach(item => {
                mIntPorcent += item.porcen
                if (mIntPorcent>100){
                    mArrErrorLines.push(objLines.linid)
                }
            })
            mArrLines.push(objLines);
        }
        // console.log('L->', objLines);
    });
    // console.log(mArrErrorLines);
    if(mArrErrorLines.length > 0) {
        throw `Las lineas superan el 100% para los componentes asignados: [${mArrErrorLines}].`;
    }
    return mArrLines;
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
var mArrDataLines = __getDataLines(pIntCabid, mObjGcomfach.impfac);

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
                tipo_proceso     :  mObjGcomfach.tipo_proceso,
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
        // console.log(mArrAssetSrc[0]);
        /**
         * Genera elementos y componentes de activos fijos.
        **/
        // Ax.db.call("gdoc_GenAssets", "gcomfach", "gcomfacl", pIntCabid, mArrAssetSrc);
        generateElemCompActFijo(pIntCabid, mArrAssetSrc);

    }
} else {
    console.log('Sin componentes asignados');
}

// console.log(mArrAssetSrc);


/**
 * gcomfach_GenAssets
 * gdoc_GenAssets
 * crp_cinmelemGenera
 * 
 * http://10.8.0.32:8080/apps/ghq_crp_dev/jrep/formauto_s?code=gcomfacl&user=deister_jha&dbms=ghq_crp_dev&cond=gcomfacl.cabid%20%3D%2014590&meta=&sort=cabid%2Corden%20DESC&ppos=0&rand=1682616112882&cond_gcomfach=gcomfach.cabid%20%3D%2014590&meta_gcomfach=&sort_gcomfach=delega%2Ccabid%20DESC&ppos_gcomfach=0&prowid_gcomfach=rowid%20%3D%20166149
 * 
 */