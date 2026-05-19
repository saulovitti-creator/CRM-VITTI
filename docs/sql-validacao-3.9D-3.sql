-- Sprint 3.9D-3 - validacoes SQL pos-migration (somente leitura)

-- Conta default
SELECT * FROM accounts WHERE id = 1;

-- Admin vinculado como owner/admin na conta 1
SELECT * FROM account_members WHERE accountId = 1;

-- accountId preenchido
SELECT COUNT(*) FROM contacts WHERE accountId IS NULL OR accountId != 1;
SELECT COUNT(*) FROM pipelines WHERE accountId IS NULL OR accountId != 1;
SELECT COUNT(*) FROM pipeline_stages WHERE accountId IS NULL OR accountId != 1;
SELECT COUNT(*) FROM tags WHERE accountId IS NULL OR accountId != 1;
SELECT COUNT(*) FROM custom_field_definitions WHERE accountId IS NULL OR accountId != 1;
SELECT COUNT(*) FROM opportunities WHERE accountId IS NULL OR accountId != 1;

-- Consistencia contact_tags
SELECT ct.id
FROM contact_tags ct
JOIN contacts c ON ct.contactId = c.id
JOIN tags t ON ct.tagId = t.id
WHERE c.accountId != t.accountId;

-- Consistencia opportunity/contact
SELECT o.id
FROM opportunities o
JOIN contacts c ON o.contactId = c.id
WHERE o.accountId != c.accountId;

-- Consistencia opportunity/pipeline
SELECT o.id
FROM opportunities o
JOIN pipelines p ON o.pipelineId = p.id
WHERE o.accountId != p.accountId;

-- Consistencia stage/pipeline
SELECT ps.id
FROM pipeline_stages ps
JOIN pipelines p ON ps.pipelineId = p.id
WHERE ps.accountId != p.accountId;

-- Verificar unique composto em tags
SHOW CREATE TABLE tags;
