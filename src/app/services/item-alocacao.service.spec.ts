import { TestBed } from '@angular/core/testing';

import { ItemsAlocacaoService } from './item-alocacao.service';

describe('ItemAlocacaoService', () => {
  let service: ItemsAlocacaoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ItemsAlocacaoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
