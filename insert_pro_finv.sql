
-- SENTENCIAS EJECUTADAS PARA DESCONTABILIZAR FACTURAS DE INVERSION


/** FINV 007 */


SELECT * FROM crp_related_cominv;
-- 61 -> 203 ->
-- SELECT * FROM crp_related_cominv WHERE loteid = '1103562';

-- cpar_premovi
SELECT linid, loteid FROM cpar_premovi WHERE cpar_premovi.tabori  = 'gcomfach' AND cpar_premovi.docser  = 'FINV0000007' AND cpar_premovi.fecdoc  = MDY(5,11,2023) AND cpar_premovi.tercer  = '00041214';
-- INSERT INTO crp_related_cominv (cparpremovi, loteid) SELECT linid, loteid FROM cpar_premovi WHERE cpar_premovi.tabori  = 'gcomfach' AND cpar_premovi.docser  = 'FINV0000007' AND cpar_premovi.fecdoc  = MDY(5,11,2023) AND cpar_premovi.tercer  = '00041214';

-- cinmelem
SELECT seqno, 1103562 AS loteid, 1 AS auxnum1 FROM cinmelem WHERE codele >= 125014903 AND codele <= 125015044;
-- INSERT INTO crp_related_cominv (cinmelem, loteid, auxnum1) SELECT seqno, 1103562 AS loteid, 1 AS auxnum1 FROM cinmelem WHERE codele >= 125014903 AND codele <= 125015044;

-- cinmcomp
SELECT seqno, 1103562 AS loteid FROM cinmcomp WHERE cinmcomp.seqno IN (SELECT cinmcomp_orig.seqno FROM cinmcomp_orig, gcomfacl WHERE cinmcomp_orig.tabori = 'gcomfacl' AND cinmcomp_orig.docid  = gcomfacl.linid AND gcomfacl.cabid       = 18060);

-- INSERT INTO crp_related_cominv (cinmcomp, loteid) SELECT seqno, 1103562 AS loteid FROM cinmcomp WHERE cinmcomp.seqno IN (SELECT cinmcomp_orig.seqno FROM cinmcomp_orig, gcomfacl WHERE cinmcomp_orig.tabori = 'gcomfacl' AND cinmcomp_orig.docid  = gcomfacl.linid AND gcomfacl.cabid       = 18060);




/** FINV 005 */ 

SELECT * FROM crp_related_cominv;
-- 70 ->  ->
-- SELECT * FROM crp_related_cominv WHERE loteid = '1103562';

-- cpar_premovi
SELECT linid, loteid FROM cpar_premovi WHERE cpar_premovi.tabori  = 'gcomfach' AND cpar_premovi.docser  = 'FINV0000005' AND cpar_premovi.fecdoc  = MDY(5,2,2023) AND cpar_premovi.tercer  = '00044274';
-- INSERT INTO crp_related_cominv (cparpremovi, loteid) SELECT linid, loteid FROM cpar_premovi WHERE cpar_premovi.tabori  = 'gcomfach' AND cpar_premovi.docser  = 'FINV0000005' AND cpar_premovi.fecdoc  = MDY(5,2,2023) AND cpar_premovi.tercer  = '00044274';

-- cinmelem
SELECT seqno, 1104561 AS loteid, 1 AS auxnum1 FROM cinmelem WHERE codele >= 125015105 AND codele <= 125015132;
-- INSERT INTO crp_related_cominv (cinmelem, loteid, auxnum1) SELECT seqno, 1104561 AS loteid, 1 AS auxnum1 FROM cinmelem WHERE codele >= 125015105 AND codele <= 125015132;

-- cinmcomp
SELECT seqno, 1104561 AS loteid FROM cinmcomp WHERE cinmcomp.seqno IN (SELECT cinmcomp_orig.seqno FROM cinmcomp_orig, gcomfacl WHERE cinmcomp_orig.tabori = 'gcomfacl' AND cinmcomp_orig.docid  = gcomfacl.linid AND gcomfacl.cabid       = 17258);

-- INSERT INTO crp_related_cominv (cinmcomp, loteid) SELECT seqno, 1104561 AS loteid FROM cinmcomp WHERE cinmcomp.seqno IN (SELECT cinmcomp_orig.seqno FROM cinmcomp_orig, gcomfacl WHERE cinmcomp_orig.tabori = 'gcomfacl' AND cinmcomp_orig.docid  = gcomfacl.linid AND gcomfacl.cabid       = 17258);


/** FINV 012 */


SELECT * FROM crp_related_cominv;
-- 77 ->  ->
-- SELECT * FROM crp_related_cominv WHERE loteid = '1103562';

-- cpar_premovi
SELECT linid, loteid FROM cpar_premovi WHERE cpar_premovi.tabori  = 'gcomfach' AND cpar_premovi.docser  = 'FINV0000012' AND cpar_premovi.fecdoc  = MDY(5,26,2023) AND cpar_premovi.tercer  = '00044274';
-- INSERT INTO crp_related_cominv (cparpremovi, loteid) SELECT linid, loteid FROM cpar_premovi WHERE cpar_premovi.tabori  = 'gcomfach' AND cpar_premovi.docser  = 'FINV0000012' AND cpar_premovi.fecdoc  = MDY(5,26,2023) AND cpar_premovi.tercer  = '00044274';

-- cinmelem
SELECT seqno, 1108056 AS loteid, 1 AS auxnum1 FROM cinmelem WHERE codele >= 125015167 AND codele <= 125015170;
-- INSERT INTO crp_related_cominv (cinmelem, loteid, auxnum1) SELECT seqno, 1108056 AS loteid, 1 AS auxnum1 FROM cinmelem WHERE codele >= 125015167 AND codele <= 125015170;

-- cinmcomp
SELECT seqno, 1108056 AS loteid FROM cinmcomp WHERE cinmcomp.seqno IN (SELECT cinmcomp_orig.seqno FROM cinmcomp_orig, gcomfacl WHERE cinmcomp_orig.tabori = 'gcomfacl' AND cinmcomp_orig.docid  = gcomfacl.linid AND gcomfacl.cabid       = 19834);

-- INSERT INTO crp_related_cominv (cinmcomp, loteid) SELECT seqno, 1108056 AS loteid FROM cinmcomp WHERE cinmcomp.seqno IN (SELECT cinmcomp_orig.seqno FROM cinmcomp_orig, gcomfacl WHERE cinmcomp_orig.tabori = 'gcomfacl' AND cinmcomp_orig.docid  = gcomfacl.linid AND gcomfacl.cabid       = 19834);


/** FINV 013 */


SELECT * FROM crp_related_cominv;
-- 77 -> 89 ->
-- SELECT * FROM crp_related_cominv WHERE loteid = '1103562';

-- cpar_premovi
SELECT linid, loteid FROM cpar_premovi WHERE cpar_premovi.tabori  = 'gcomfach' AND cpar_premovi.docser  = 'FINV0000013' AND cpar_premovi.fecdoc  = MDY(5,30,2023) AND cpar_premovi.tercer  = '00041214';
-- INSERT INTO crp_related_cominv (cparpremovi, loteid) SELECT linid, loteid FROM cpar_premovi WHERE cpar_premovi.tabori  = 'gcomfach' AND cpar_premovi.docser  = 'FINV0000013' AND cpar_premovi.fecdoc  = MDY(5,30,2023) AND cpar_premovi.tercer  = '00041214';

-- cinmelem
SELECT seqno, 1109936 AS loteid, 1 AS auxnum1 FROM cinmelem WHERE codele >= 125015171 AND codele <= 125015223;
-- INSERT INTO crp_related_cominv (cinmelem, loteid, auxnum1) SELECT seqno, 1109936 AS loteid, 1 AS auxnum1 FROM cinmelem WHERE codele >= 125015171 AND codele <= 125015223;

-- cinmcomp
SELECT seqno, 1109936 AS loteid FROM cinmcomp WHERE cinmcomp.seqno IN (SELECT cinmcomp_orig.seqno FROM cinmcomp_orig, gcomfacl WHERE cinmcomp_orig.tabori = 'gcomfacl' AND cinmcomp_orig.docid  = gcomfacl.linid AND gcomfacl.cabid       = 20182);

-- INSERT INTO crp_related_cominv (cinmcomp, loteid) SELECT seqno, 1109936 AS loteid FROM cinmcomp WHERE cinmcomp.seqno IN (SELECT cinmcomp_orig.seqno FROM cinmcomp_orig, gcomfacl WHERE cinmcomp_orig.tabori = 'gcomfacl' AND cinmcomp_orig.docid  = gcomfacl.linid AND gcomfacl.cabid       = 20182);


