// ?page=2&limit=10 পড়ে skip/limit বের করে। সব list API এটাই ব্যবহার করবে।
function getPagination(query) {
    const page = Math.max(parseInt(query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 50); // সর্বোচ্চ ৫০
    return { page, limit, skip: (page - 1) * limit };
}

function buildMeta(page, limit, total) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

module.exports = { getPagination, buildMeta };