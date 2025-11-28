const { supabase } = require('../../../db/supabase');

/**
 * Repositorio para operaciones de base de datos de blogs
 * Capa de acceso a datos
 */
class BlogRepository {
  /**
   * Crear un nuevo blog
   */
  async create(blogData) {
    const { data, error } = await supabase
      .from('blogs')
      .insert(blogData)
      .select(`
        *,
        creator:users!created_by (
          id,
          username,
          email
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Obtener todos los blogs con paginación
   */
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('blogs')
      .select(`
        *,
        creator:users!created_by (
          id,
          username,
          email
        )
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Obtener un blog por ID
   */
  async findById(id) {
    const { data, error } = await supabase
      .from('blogs')
      .select(`
        *,
        creator:users!created_by (
          id,
          username,
          email
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      throw error;
    }

    return data;
  }

  /**
   * Actualizar un blog
   */
  async update(id, updateData) {
    const { data, error } = await supabase
      .from('blogs')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select(`
        *,
        creator:users!created_by (
          id,
          username,
          email
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      throw error;
    }

    return data;
  }

  /**
   * Eliminar un blog (soft delete)
   */
  async delete(id) {
    const { data, error } = await supabase
      .from('blogs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      throw error;
    }

    return data;
  }

  /**
   * Buscar blogs por texto
   */
  async search(searchText, options = {}) {
    const {
      page = 1,
      limit = 10
    } = options;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('blogs')
      .select(`
        *,
        creator:users!created_by (
          id,
          username,
          email
        )
      `, { count: 'exact' })
      .is('deleted_at', null)
      .or(`title.ilike.%${searchText}%,content.ilike.%${searchText}%`)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Contar blogs totales
   */
  async count() {
    const { count, error } = await supabase
      .from('blogs')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    if (error) throw error;
    return count;
  }

  /**
   * Verificar si un blog existe
   */
  async exists(id) {
    const { data, error } = await supabase
      .from('blogs')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  }
}

module.exports = new BlogRepository();
